import ReactMarkdown from "react-markdown";
import {
  formatRelativeWait,
  formatShortTime,
  prettyJson,
  summarizeEvent,
} from "../utils.js";
import {
  CopyButton,
  ErrorBox,
  MetricGrid,
  ResultCard,
  StatusCard,
  StatusPill,
  TabButton,
  TabEmptyState,
} from "./ui.jsx";

export function ResultsPanel({
  socketLabel,
  job,
  latestError,
  activeTab,
  onTabChange,
  summaryText,
  reviewResult,
  triggers,
  submittedLogText,
  submittedCallstack,
  events,
  onCopyError,
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill tone={socketLabel.tone}>{socketLabel.label}</StatusPill>
        {job.jobId ? <StatusPill tone="neutral">Job {job.jobId}</StatusPill> : null}
      </div>

      <h2 className="mt-5 text-[1.35rem] font-semibold tracking-[-0.02em]">
        Live job status and results
      </h2>
      <p className="mt-2 text-base leading-7 text-stone-600">
        Move between summary, status, review artifacts, submitted inputs, and the live event
        stream without stacking every result into one long panel.
      </p>

      {latestError ? <ErrorBox className="mt-5">{latestError}</ErrorBox> : null}

      <div className="mt-5 overflow-x-auto px-1 pt-1 pb-2">
        <div className="flex min-w-max gap-2">
          {RESULT_TABS.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {activeTab === "summary" ? (
          summaryText ? (
            <ResultCard
              title="Summary"
              description="Generated analyst narrative from the completed job."
              action={
                <CopyButton text={summaryText} onError={onCopyError}>
                  Copy summary
                </CopyButton>
              }
            >
              <MarkdownSummary markdown={summaryText} />
            </ResultCard>
          ) : (
            <TabEmptyState>Summary will appear here when the analysis completes.</TabEmptyState>
          )
        ) : null}

        {activeTab === "status" ? (
          <div className="grid gap-4">
            {job.queue ? <QueueCard queue={job.queue} jobId={job.jobId} /> : null}
            {job.progress || job.started ? (
              <ProgressCard progress={job.progress} started={job.started} />
            ) : null}
            {job.failed ? <FailedCard failed={job.failed} /> : null}
            {!job.queue && !job.progress && !job.started && !job.failed ? (
              <TabEmptyState>
                Queue position, pipeline progress, and failure details will appear here.
              </TabEmptyState>
            ) : null}
          </div>
        ) : null}

        {activeTab === "review" ? (
          reviewResult ? (
            <ResultCard title="Structured review">
              <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 font-mono text-sm leading-6 text-orange-50">
                {prettyJson(reviewResult)}
              </pre>
            </ResultCard>
          ) : (
            <TabEmptyState>
              Structured review output will appear here when the analysis finishes.
            </TabEmptyState>
          )
        ) : null}

        {activeTab === "triggers" ? (
          triggers && (Array.isArray(triggers) ? triggers.length > 0 : true) ? (
            <ResultCard
              title="Triggers"
              description="Ranked suggestions from the completed analysis pipeline."
              action={
                <CopyButton
                  text={Array.isArray(triggers) ? prettyJson(triggers) : String(triggers ?? "")}
                  onError={onCopyError}
                >
                  Copy triggers
                </CopyButton>
              }
            >
              {Array.isArray(triggers) ? (
                <ol className="grid gap-3">
                  {triggers.map((trigger, index) => (
                    <li
                      key={`${index}-${typeof trigger === "string" ? trigger : "trigger"}`}
                      className="rounded-2xl border border-stone-300/60 bg-white/80 p-4"
                    >
                      {typeof trigger === "string" ? (
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 font-extrabold text-orange-900">
                            {index + 1}
                          </span>
                          <span className="font-semibold">{trigger}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 font-extrabold text-orange-900">
                              {index + 1}
                            </span>
                            <span className="font-semibold">
                              {trigger.title ??
                                trigger.name ??
                                trigger.trigger ??
                                trigger.summary ??
                                `Trigger ${index + 1}`}
                            </span>
                          </div>
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                            {Object.entries(trigger)
                              .filter(([key]) =>
                                !["title", "name", "trigger", "summary"].includes(key),
                              )
                              .map(
                                ([key, value]) =>
                                  `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`,
                              )
                              .join("\n")}
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 font-mono text-sm leading-6 text-orange-50">
                  {prettyJson(triggers)}
                </pre>
              )}
            </ResultCard>
          ) : (
            <TabEmptyState>
              Ranked trigger suggestions will appear here when they are available.
            </TabEmptyState>
          )
        ) : null}

        {activeTab === "inputs" ? (
          submittedLogText || submittedCallstack ? (
            <div className="grid gap-4">
              {submittedLogText ? (
                <ResultCard title="Submitted logs">
                  <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 font-mono text-sm leading-6 text-orange-50">
                    {submittedLogText}
                  </pre>
                </ResultCard>
              ) : null}
              {submittedCallstack ? (
                <ResultCard title="Submitted callstack">
                  <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 font-mono text-sm leading-6 text-orange-50">
                    {submittedCallstack}
                  </pre>
                </ResultCard>
              ) : null}
            </div>
          ) : (
            <TabEmptyState>
              Submitted logs and callstack will appear here after you send them with a job.
            </TabEmptyState>
          )
        ) : null}

        {activeTab === "events" ? <TimelineCard events={events} /> : null}

        {!hasAnyActivity(job, events) && activeTab !== "events" ? (
          <div className="mt-4 rounded-[22px] border border-dashed border-stone-300/70 bg-white/45 px-6 py-8 text-center text-stone-600">
            Waiting for your first analysis request. The selected tab will populate as the job
            moves through queueing, pipeline execution, and final output.
          </div>
        ) : null}
      </div>
    </>
  );
}

function QueueCard({ queue, jobId }) {
  return (
    <StatusCard title="Queued">
      <MetricGrid
        items={[
          ["Job ID", queue.job_id ?? jobId ?? "--"],
          ["Queue position", queue.queue_position ?? "--"],
          [
            "Estimated wait",
            formatRelativeWait(queue.estimated_wait_time ?? queue.estimated_wait_seconds),
          ],
        ]}
      />
    </StatusCard>
  );
}

function ProgressCard({ progress, started }) {
  const percent = clampPercent(progress?.percent_complete ?? (started ? 5 : 0));
  const stage = progress?.current_stage ?? progress?.stage ?? (started ? "starting" : "pending");
  const message = progress?.latest_stage_message ?? progress?.message ?? "Pipeline is running.";

  return (
    <StatusCard title="Pipeline progress">
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3 text-sm text-stone-600">
          <span>Stage: {stage}</span>
          <strong className="text-stone-900">{percent}%</strong>
        </div>
        <div className="h-3.5 overflow-hidden rounded-full bg-stone-700/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-700 transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="rounded-[18px] border border-orange-300/35 bg-orange-500/8 px-4 py-3 leading-6 text-stone-600">
          {message}
        </div>
      </div>
    </StatusCard>
  );
}

function FailedCard({ failed }) {
  return (
    <StatusCard title="Job failure">
      <MetricGrid items={[["Error code", failed.code ?? "--"]]} />
      <ErrorBox className="mt-4">{failed.message ?? "Unknown failure."}</ErrorBox>
    </StatusCard>
  );
}

function TimelineCard({ events }) {
  return (
    <section className="rounded-[22px] border border-stone-300/55 bg-white/78 p-5">
      <h3 className="text-[1.02rem] font-semibold text-stone-900">Live events</h3>
      {events.length === 0 ? (
        <div className="mt-3 rounded-[22px] border border-dashed border-stone-300/70 bg-white/45 px-6 py-8 text-center text-stone-600">
          Connects on load and waits for the gateway to emit queue, progress, and completion
          updates here.
        </div>
      ) : (
        <ol className="mt-4 grid gap-3">
          {events.map((event, index) => (
            <li
              key={`${event.receivedAt}-${event.type}-${index}`}
              className="grid gap-2 md:grid-cols-[108px_minmax(0,1fr)]"
            >
              <div className="pt-0.5 font-mono text-xs text-stone-500">
                {formatShortTime(event.receivedAt)}
              </div>
              <div className="rounded-2xl border border-stone-300/55 bg-white/75 p-4">
                <div className="font-semibold text-stone-900">{event.type}</div>
                <div className="mt-1 break-words text-sm leading-6 text-stone-600">
                  {summarizeEvent(event.payload)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function MarkdownSummary({ markdown }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mt-0 mb-4 whitespace-pre-wrap leading-7 text-stone-700">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-stone-950">{children}</strong>
          ),
          ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-6">{children}</ul>,
          li: ({ children }) => <li className="leading-7 text-stone-700">{children}</li>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function hasAnyActivity(job, events) {
  return Boolean(
    events.length ||
      job.queue ||
      job.started ||
      job.progress ||
      job.completed ||
      job.failed,
  );
}

const RESULT_TABS = [
  { id: "summary", label: "Summary" },
  { id: "status", label: "Status" },
  { id: "review", label: "Review" },
  { id: "triggers", label: "Triggers" },
  { id: "inputs", label: "Inputs" },
  { id: "events", label: "Events" },
];
