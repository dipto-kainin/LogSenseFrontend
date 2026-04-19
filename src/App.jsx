import { useEffect, useMemo, useRef, useState } from "react";
import { AnalysisForm } from "./components/AnalysisForm.jsx";
import { ResultsPanel } from "./components/ResultsPanel.jsx";
import { MetaCard, Panel } from "./components/ui.jsx";
import { AnalysisSocketService } from "./services/analysisSocket.js";
import {
  clampPriority,
  createDefaultPayload,
  datetimeLocalToIso,
  formatTimestamp,
  getSocketUrl,
  loadStoredPayload,
  persistPayload,
  validatePayload,
} from "./utils.js";

const MAX_EVENT_HISTORY = 12;

const INITIAL_JOB = {
  jobId: "",
  queue: null,
  started: null,
  progress: null,
  completed: null,
  failed: null,
};

export default function App() {
  const [payload, setPayload] = useState(() => loadStoredPayload());
  const [errors, setErrors] = useState({});
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [socketUrl] = useState(() => getSocketUrl());
  const [activeJob, setActiveJob] = useState(false);
  const [latestError, setLatestError] = useState("");
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  const [job, setJob] = useState(INITIAL_JOB);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("summary");
  const socketServiceRef = useRef(null);
  const activeJobRef = useRef(activeJob);

  useEffect(() => {
    activeJobRef.current = activeJob;
  }, [activeJob]);

  useEffect(() => {
    persistPayload(payload);
  }, [payload]);

  useEffect(() => {
    const socketService = new AnalysisSocketService({
      url: socketUrl,
      onStatusChange: (status) => {
        setSocketStatus(status);
      },
      onConnected: (connectedAt) => {
        setLastConnectedAt(connectedAt);
        setLatestError("");
      },
      onEvent: (event) => {
        applyServerEvent(event);
      },
      onClose: () => {
        if (activeJobRef.current) {
          setLatestError(
            "The socket closed while a job was active. Reconnecting now so you can resubmit if needed.",
          );
        }
        setActiveJob(false);
      },
      onError: (message) => {
        setActiveJob(false);
        setLatestError(message);
      },
    });

    socketServiceRef.current = socketService;
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, [socketUrl]);

  const completed = job.completed ?? {};
  const reviewResult = completed.review_result ?? completed.result?.review_result ?? null;
  const summaryText = completed.summary_text ?? completed.result?.summary_text ?? "";
  const triggers = completed.triggers ?? completed.result?.triggers ?? [];
  const submittedLogText = completed.log_text ?? payload.log_text;
  const submittedCallstack = completed.callstack ?? payload.callstack;
  const socketLabel = useMemo(() => getSocketLabel(socketStatus), [socketStatus]);

  function applyServerEvent(event) {
    const payloadData = event.payload ?? {};

    setEvents((current) =>
      [{ ...event, receivedAt: new Date().toISOString() }, ...current].slice(0, MAX_EVENT_HISTORY),
    );

    if (event.type === "error") {
      setLatestError(payloadData.message ?? payloadData.detail ?? "Unknown gateway error.");
    }

    switch (event.type) {
      case "connected":
      case "auth_ok":
        setSocketStatus("connected");
        break;
      case "queued":
        setActiveJob(true);
        setJob((current) => ({
          ...current,
          jobId: payloadData.job_id ?? current.jobId,
          queue: payloadData,
          failed: null,
        }));
        break;
      case "started":
        setActiveJob(true);
        setJob((current) => ({
          ...current,
          jobId: payloadData.job_id ?? current.jobId,
          started: payloadData,
        }));
        break;
      case "progress":
        setActiveJob(true);
        setJob((current) => ({
          ...current,
          jobId: payloadData.job_id ?? current.jobId,
          progress: payloadData,
        }));
        break;
      case "completed":
        setActiveJob(false);
        setJob((current) => ({
          ...current,
          jobId: payloadData.job_id ?? current.jobId,
          completed: payloadData,
          failed: null,
        }));
        break;
      case "failed":
      case "cancelled":
      case "expired":
        setActiveJob(false);
        setJob((current) => ({
          ...current,
          failed: {
            code: payloadData.code ?? event.type.toUpperCase(),
            message:
              payloadData.message ??
              payloadData.detail ??
              `${event.type} without additional details.`,
          },
        }));
        break;
      case "error":
        setActiveJob(false);
        setJob((current) => ({
          ...current,
          failed: {
            code: payloadData.code ?? "ERROR",
            message: payloadData.message ?? payloadData.detail ?? "Unknown gateway error.",
          },
        }));
        break;
      default:
        break;
    }
  }

  function updateField(name, value) {
    setPayload((current) => ({
      ...current,
      [name]: name === "priority" ? clampPriority(value) : value,
    }));

    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      if (name === "start_ts" || name === "end_ts") {
        delete next.start_ts;
        delete next.end_ts;
      }
      return next;
    });
  }

  function handleReset() {
    setPayload(createDefaultPayload());
    setErrors({});
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validatePayload(payload);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const requestPayload = {
      service_name: payload.service_name.trim(),
      start_ts: datetimeLocalToIso(payload.start_ts),
      end_ts: datetimeLocalToIso(payload.end_ts),
      priority: clampPriority(payload.priority),
      ...(payload.log_text.trim() ? { log_text: payload.log_text } : {}),
      ...(payload.callstack.trim() ? { callstack: payload.callstack } : {}),
    };

    const socketService = socketServiceRef.current;
    if (!socketService?.isOpen()) {
      socketService?.connect();
      setLatestError("Socket was not ready. Reconnecting now and try submit again in a moment.");
      return;
    }

    try {
      socketService.sendAnalyse(requestPayload);
    } catch {
      setLatestError("Socket was not ready. Reconnecting now and try submit again in a moment.");
      socketService.connect();
      return;
    }

    setActiveJob(true);
    setLatestError("");
    setActiveTab("summary");
    setJob(INITIAL_JOB);
    setEvents([]);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f1e6_0%,#f0e7db_44%,#ede3d5_100%)] text-stone-900">
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(80,51,23,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(80,51,23,0.05)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.35),transparent_78%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,177,91,0.28),transparent_34%),radial-gradient(circle_at_top_right,rgba(199,87,43,0.18),transparent_28%)]" />

      <main className="relative mx-auto max-w-[1480px] px-5 py-10 md:px-8">
        <section className="mb-6 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[760px]">
            <div className="inline-flex rounded-full border border-stone-300/60 bg-white/70 px-4 py-2 text-[0.83rem] uppercase tracking-[0.14em] text-orange-800 shadow-sm backdrop-blur">
              LogSense Incident Console
            </div>
            <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-[0.93] tracking-[-0.05em] text-stone-950 sm:text-6xl lg:text-7xl">
              Stream queue status, pipeline progress, and root-cause output in one place.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-stone-600 sm:text-lg">
              Built for the existing FastAPI gateway contract. Submit a service window, keep
              pasted logs and callstack visible, and watch the job move from queued to completed
              without leaving the page.
            </p>
          </div>

          <div className="grid min-w-[260px] gap-3 md:grid-cols-2 xl:grid-cols-1">
            <MetaCard label="WebSocket" value={socketUrl} />
            <MetaCard
              label="Last connected"
              value={lastConnectedAt ? formatTimestamp(lastConnectedAt) : "Waiting for gateway"}
            />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(320px,440px)_minmax(0,1fr)]">
          <Panel>
            <AnalysisForm
              payload={payload}
              errors={errors}
              activeJob={activeJob}
              socketStatus={socketStatus}
              onFieldChange={updateField}
              onReset={handleReset}
              onSubmit={handleSubmit}
            />
          </Panel>

          <Panel>
            <ResultsPanel
              socketLabel={socketLabel}
              job={job}
              latestError={latestError}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              summaryText={summaryText}
              reviewResult={reviewResult}
              triggers={triggers}
              submittedLogText={submittedLogText}
              submittedCallstack={submittedCallstack}
              events={events}
              onCopyError={setLatestError}
            />
          </Panel>
        </section>
      </main>
    </div>
  );
}

function getSocketLabel(status) {
  switch (status) {
    case "connected":
      return { label: "Socket connected", tone: "success" };
    case "connecting":
      return { label: "Connecting to gateway", tone: "warning" };
    case "failed":
      return { label: "Socket error", tone: "danger" };
    default:
      return { label: "Socket disconnected", tone: "danger" };
  }
}
