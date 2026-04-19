export const STORAGE_KEY = "logsense.analysisPayload";

export const DEFAULT_SOCKET_URL = "ws://localhost:8000/ws";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatLocalDateTimeInput(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

export function createDefaultPayload() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 60 * 1000);

  return {
    service_name: "",
    start_ts: formatLocalDateTimeInput(start),
    end_ts: formatLocalDateTimeInput(end),
    priority: 3,
    log_text: "",
    callstack: "",
  };
}

export function loadStoredPayload() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultPayload();
    }

    const parsed = JSON.parse(raw);
    return {
      ...createDefaultPayload(),
      ...parsed,
      priority: clampPriority(parsed.priority),
      log_text: String(parsed.log_text ?? ""),
      callstack: String(parsed.callstack ?? ""),
    };
  } catch (error) {
    return createDefaultPayload();
  }
}

export function persistPayload(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clampPriority(value) {
  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) {
    return 3;
  }
  return Math.min(5, Math.max(1, numeric));
}

export function datetimeLocalToIso(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString();
}

export function validatePayload(payload) {
  const errors = {};
  const serviceName = payload.service_name.trim();

  if (serviceName.length < 2 || serviceName.length > 100) {
    errors.service_name = "Service name must be between 2 and 100 characters.";
  }

  const start = new Date(payload.start_ts);
  const end = new Date(payload.end_ts);

  if (Number.isNaN(start.getTime())) {
    errors.start_ts = "Start time must be a valid ISO datetime.";
  }

  if (Number.isNaN(end.getTime())) {
    errors.end_ts = "End time must be a valid ISO datetime.";
  }

  if (!errors.start_ts && !errors.end_ts && start >= end) {
    errors.end_ts = "End time must be after the start time.";
  }

  if (payload.log_text.length > 50000) {
    errors.log_text = "Pasted logs must be 50,000 characters or fewer.";
  }

  if (payload.callstack.length > 20000) {
    errors.callstack = "Callstack must be 20,000 characters or fewer.";
  }

  return errors;
}

export function summarizeEvent(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const preferredKeys = [
    "message",
    "detail",
    "stage_message",
    "current_stage",
    "job_id",
    "code",
  ];

  for (const key of preferredKeys) {
    if (payload[key]) {
      return `${key.replaceAll("_", " ")}: ${payload[key]}`;
    }
  }

  return JSON.stringify(payload);
}

export function formatRelativeWait(seconds) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return "Estimating...";
  }
  if (numeric < 60) {
    return `${Math.round(numeric)} sec`;
  }
  const minutes = Math.floor(numeric / 60);
  const remainder = Math.round(numeric % 60);
  return remainder > 0 ? `${minutes} min ${remainder} sec` : `${minutes} min`;
}

export function formatTimestamp(dateLike) {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
  }).format(value);
}

export function formatShortTime(dateLike) {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export function getSocketUrl() {
  const fromWindow = window.localStorage.getItem("logsense.socketUrl");
  return fromWindow || DEFAULT_SOCKET_URL;
}

export function copyToClipboard(text) {
  if (!navigator.clipboard?.writeText) {
    return Promise.reject(new Error("Clipboard access is unavailable."));
  }
  return navigator.clipboard.writeText(text);
}

export function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

export function normalizeEventShape(raw) {
  if (typeof raw === "string") {
    return { type: raw, payload: {} };
  }

  if (!raw || typeof raw !== "object") {
    return { type: "error", payload: { message: "Received an unreadable event." } };
  }

  if (typeof raw.type === "string") {
    return { type: raw.type, payload: raw.payload ?? raw.data ?? {} };
  }

  if (typeof raw.event === "string") {
    return { type: raw.event, payload: raw.payload ?? raw.data ?? {} };
  }

  return { type: "message", payload: raw };
}
