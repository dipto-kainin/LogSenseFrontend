# LogSense Frontend

Vite + React + Tailwind client for the FastAPI incident-analysis gateway.

## Run locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Backend contract

- WebSocket endpoint: `ws://localhost:8000/ws`
- Client sends: `type: "analyse"`
- Handles server events:
  - `connected`
  - `auth_ok`
  - `queued`
  - `started`
  - `progress`
  - `completed`
  - `failed`
  - `cancelled`
  - `expired`
  - `error`

## Notes

- The last submitted payload is preserved in local storage.
- The default time window is the most recent 30 minutes.
- Summary and triggers support copy actions once a job completes.
- Vite will print the local URL for the dev server, typically `http://localhost:5173`.
