import { normalizeEventShape } from "../utils.js";

const RECONNECT_DELAY_MS = 2000;

export class AnalysisSocketService {
  constructor({ url, onStatusChange, onConnected, onEvent, onClose, onError }) {
    this.url = url;
    this.onStatusChange = onStatusChange;
    this.onConnected = onConnected;
    this.onEvent = onEvent;
    this.onClose = onClose;
    this.onError = onError;
    this.socket = null;
    this.destroyed = false;
    this.reconnectTimer = null;
  }

  connect() {
    if (this.destroyed) {
      return;
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    window.clearTimeout(this.reconnectTimer);
    this.onStatusChange?.("connecting");

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.destroyed || this.socket !== socket) {
        return;
      }

      this.onStatusChange?.("connected");
      this.onConnected?.(new Date().toISOString());
    });

    socket.addEventListener("message", (event) => {
      if (this.destroyed || this.socket !== socket) {
        return;
      }

      this.onEvent?.(parseSocketMessage(event.data));
    });

    socket.addEventListener("close", () => {
      if (this.destroyed || this.socket !== socket) {
        return;
      }

      this.onStatusChange?.("disconnected");
      this.onClose?.();
      this.reconnectTimer = window.setTimeout(() => {
        this.connect();
      }, RECONNECT_DELAY_MS);
    });

    socket.addEventListener("error", () => {
      if (this.destroyed || this.socket !== socket) {
        return;
      }

      this.onStatusChange?.("failed");
      this.onError?.(
        "WebSocket connection failed. Confirm the FastAPI gateway is listening on ws://localhost:8000/ws.",
      );
    });
  }

  disconnect() {
    this.destroyed = true;
    window.clearTimeout(this.reconnectTimer);

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      this.socket.close();
    }
  }

  isOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  sendAnalyse(payload) {
    if (!this.isOpen()) {
      throw new Error("Socket is not ready.");
    }

    this.socket.send(
      JSON.stringify({
        type: "analyse",
        payload,
      }),
    );
  }
}

function parseSocketMessage(rawData) {
  try {
    return normalizeEventShape(JSON.parse(rawData));
  } catch {
    return normalizeEventShape(rawData);
  }
}
