# LinkScreen — Full Implementation Plan

> Aligned with: `_spec/linkscreen_full_spec.md` and `linkscreen_project_brief.md`
> Stack constraints from: `CLAUDE.md`

---

## Overview

LinkScreen is a browser-based, peer-to-peer screen sharing app. A host generates a unique link; a viewer opens it and instantly sees the host's screen via WebRTC. No accounts, no installs.

---

## Folder Structure

```
link-screen/
├── client/                        # React (Vite) frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── HostView.jsx        # Active sharing UI + stop button
│   │   │   ├── ViewerView.jsx      # Video display + status overlays
│   │   │   ├── LinkCard.jsx        # Shareable link display + copy
│   │   │   ├── StatusOverlay.jsx   # Reconnecting / Ended / Error states
│   │   │   └── BrowserGuard.jsx    # Blocks unsupported browsers
│   │   ├── hooks/
│   │   │   ├── queries/
│   │   │   │   └── useSession.js   # GET /api/sessions/:id
│   │   │   └── mutations/
│   │   │       └── useCreateSession.js  # POST /api/sessions
│   │   ├── lib/
│   │   │   ├── api.js              # Shared Axios client
│   │   │   ├── socket.js           # Socket.IO client singleton
│   │   │   └── webrtc.js           # RTCPeerConnection helpers
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # "Start Sharing" entry point
│   │   │   └── SessionPage.jsx     # Host or viewer view (role-routed)
│   │   ├── routes/
│   │   │   └── AppRouter.jsx       # React Router config
│   │   ├── services/
│   │   │   └── sessionService.js   # API calls via lib/api.js
│   │   ├── utils/
│   │   │   └── clipboard.js        # navigator.clipboard wrapper
│   │   └── constants/
│   │       └── constants.js        # socket events, timeouts, etc.
│   ├── test/                       # Vitest + React Testing Library
│   ├── .env
│   ├── .env.example
│   └── vite.config.js
│
├── server/                         # Node.js / Express backend
│   ├── config/
│   │   └── env.js                  # Centralised env access + fail-fast
│   ├── controllers/
│   │   └── sessionController.js    # create / get / delete handlers
│   ├── middleware/
│   │   ├── errorHandler.js         # Centralised error middleware
│   │   └── rateLimiter.js          # express-rate-limit config
│   ├── models/
│   │   └── Session.js              # Mongoose schema
│   ├── routes/
│   │   └── sessionRoutes.js        # /api/sessions router
│   ├── socket/
│   │   └── signaling.js            # Socket.IO event handlers
│   ├── utils/
│   │   └── generateId.js           # Secure session ID generator
│   ├── constants/
│   │   └── constants.js            # socket event names, TTL, etc.
│   └── tests/                      # Jest + Supertest
│
├── .env
├── .env.example
└── _spec/
```

---

## Environment Variables

### `/.env` (backend)
```
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/linkscreen
SESSION_TTL_MS=3600000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=20
```

### `/.env.example` (backend)
```
PORT=
CLIENT_URL=
MONGODB_URI=
SESSION_TTL_MS=
RATE_LIMIT_WINDOW_MS=
RATE_LIMIT_MAX=
```

### `/client/.env` (frontend)
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### `/client/.env.example` (frontend)
```
VITE_API_URL=
VITE_SOCKET_URL=
```

---

## Phase 1 — Project Setup

### Tasks
1. Scaffold `client/` with Vite + React + Tailwind
2. Scaffold `server/` with Express + Socket.IO
3. Connect MongoDB with Mongoose
4. Wire `server/config/env.js` — fail fast on missing vars
5. Create both `.env` / `.env.example` pairs
6. Set up `client/src/lib/api.js` as the Axios singleton pointing at `VITE_API_URL`
7. Set up `client/src/lib/socket.js` as the Socket.IO singleton pointing at `VITE_SOCKET_URL`
8. Install: `express-rate-limit`, `nanoid`, `cors`, `socket.io`, `mongoose`
9. Install client: `axios`, `socket.io-client`, `react-router-dom`, `@reduxjs/toolkit`, `@tanstack/react-query`

### Acceptance
- `npm run dev` starts both client and server without errors
- `/api/health` returns `{ success: true }`

---

## Phase 2 — Session Management

### Mongoose Schema — `server/models/Session.js`
```js
{
  _id: String,           // nanoid(12) — used as session ID in the URL
  createdAt: Date,       // default: Date.now
  expiresAt: Date,       // createdAt + SESSION_TTL_MS
  active: Boolean        // true until host ends or TTL passes
}
```
Add a TTL index: `{ expiresAt: 1, expireAfterSeconds: 0 }` so MongoDB auto-deletes expired docs.

### API Routes — `server/routes/sessionRoutes.js`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sessions` | Create session, return `{ id, link, expiresAt }` |
| `GET` | `/api/sessions/:id` | Validate session exists and is active |
| `DELETE` | `/api/sessions/:id` | Mark session inactive (host stop) |

All responses follow the standard envelope:
```json
{ "success": true, "data": {}, "message": "" }
{ "success": false, "error": "Message" }
```

### Rate Limiting
Apply `rateLimiter` middleware to `POST /api/sessions` and `DELETE /api/sessions/:id`.

### Frontend hooks
- `useCreateSession` — calls `POST /api/sessions`, returns session data
- `useSession(id)` — calls `GET /api/sessions/:id`, used by viewer to validate before connecting

### Acceptance
- `POST /api/sessions` → 201 with `id`, `link`, `expiresAt`
- `GET /api/sessions/:invalidId` → 404
- Expired session TTL removes doc automatically

---

## Phase 3 — Socket.IO Signaling

### Socket Events — `server/socket/signaling.js`

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `host:join` | client → server | `{ sessionId }` | Host registers in session room |
| `viewer:join` | client → server | `{ sessionId }` | Viewer registers, triggers offer request |
| `webrtc:offer` | host → server → viewer | `{ sdp }` | Host sends SDP offer |
| `webrtc:answer` | viewer → server → host | `{ sdp }` | Viewer sends SDP answer |
| `webrtc:ice-candidate` | both → server → peer | `{ candidate }` | ICE candidate relay |
| `session:end` | host → server → viewer | `{ sessionId }` | Host ends session |

### Room Strategy
Each session gets a Socket.IO room named by `sessionId`. Max 2 sockets per room (host + viewer). Reject a third join with an error event.

### Server-side Validation
- Validate `sessionId` exists and is active in MongoDB before emitting to the room
- On `host:join`, mark socket as host in room metadata
- On disconnect of host socket, auto-emit `session:end` to room and mark session inactive

### `client/src/constants/constants.js`
```js
export const SOCKET_EVENTS = {
  HOST_JOIN: 'host:join',
  VIEWER_JOIN: 'viewer:join',
  OFFER: 'webrtc:offer',
  ANSWER: 'webrtc:answer',
  ICE_CANDIDATE: 'webrtc:ice-candidate',
  SESSION_END: 'session:end',
};
```

### Acceptance
- Host and viewer land in same room
- Messages relay correctly between the two peers
- Third connection rejected

---

## Phase 4 — WebRTC

### Flow

```
Host                    Signaling Server              Viewer
 |                           |                           |
 |-- host:join ------------->|                           |
 |                           |<--------- viewer:join ----|
 |                           |-- notify host: viewer ready
 |-- getDisplayMedia()       |                           |
 |-- createOffer() --------->|                           |
 |                           |-- webrtc:offer ---------->|
 |                           |<--------- webrtc:answer --|
 |<-- webrtc:answer ---------|                           |
 |-- ICE candidates -------->|-- webrtc:ice-candidate -->|
 |<-- ICE candidates --------|<-- webrtc:ice-candidate --|
 |                           |                           |
 [P2P stream established — video flows directly]
```

### `client/src/lib/webrtc.js`

Exports two factory functions:

**`createHostConnection({ stream, onIceCandidate, onConnectionStateChange })`**
- Creates `RTCPeerConnection`
- Adds all stream tracks
- Wires `onicecandidate` → emit `webrtc:ice-candidate`
- Returns `{ pc, createOffer }`

**`createViewerConnection({ onIceCandidate, onTrack, onConnectionStateChange })`**
- Creates `RTCPeerConnection`
- Wires `ontrack` → attach to `<video>` element
- Returns `{ pc, createAnswer }`

### STUN Config
```js
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
```

### `pages/SessionPage.jsx`
- Reads `?role=host` or `?role=viewer` from URL (or absence of query = viewer)
- Host path: request `getDisplayMedia` → create session → join socket room → negotiate
- Viewer path: validate session via `useSession` → join socket room → receive stream

### Host UI (`components/HostView.jsx`)
- Shows live preview of own screen (muted `<video autoPlay muted>`)
- Shows `LinkCard` with the shareable URL
- "Stop Sharing" button → `DELETE /api/sessions/:id` + emit `session:end`

### Viewer UI (`components/ViewerView.jsx`)
- Full-screen `<video autoPlay>` element
- `StatusOverlay` for: Connecting, Reconnecting, Session Ended, Error

### Acceptance
- End-to-end screen share working Chrome → Chrome
- Video tracks flow without server involvement
- Closing host tab ends session for viewer

---

## Phase 5 — Edge Cases

### Network Drop + ICE Restart
- Monitor `RTCPeerConnection.connectionState`
- On `disconnected`: show "Reconnecting…" overlay, attempt ICE restart (`pc.restartIce()`)
- On `failed`: show "Connection Lost" with retry button that re-negotiates
- Timeout after 15s of `disconnected` → treat as `failed`

### Host Abrupt Disconnect
- Server detects socket disconnect → emits `session:end` to room
- Server marks session inactive in MongoDB
- Viewer receives `session:end` → shows "Session Ended" overlay
- Viewer cleans up RTCPeerConnection

### Permission Denied (`getDisplayMedia` rejection)
- Catch `NotAllowedError` on host side
- Show "Screen access denied" with a "Try Again" button that re-triggers `getDisplayMedia`

### Invalid / Expired Session
- Viewer calls `GET /api/sessions/:id` before attempting WebRTC
- If 404 or `active: false` → show "This session is invalid or has expired" error page
- No socket join attempted

### Browser Compatibility (`components/BrowserGuard.jsx`)
- Check `navigator.mediaDevices?.getDisplayMedia` on mount
- If unsupported → block UI and show message: "Please use Chrome, Edge, or Firefox"

### Duplicate Session Creation
- `POST /api/sessions` is idempotent per host socket — server checks if a socket already owns an active session and returns the existing one rather than creating a duplicate

### Acceptance
- All edge case UIs render correctly
- ICE restart triggers on network interruption
- Expired session shows error, not blank screen

---

## Phase 6 — Testing

### Backend (`server/tests/`)
- `session.test.js` — create, get, delete; expired session; invalid ID; rate limit (429)
- `signaling.test.js` — socket room join, message relay, third-connection rejection, host disconnect cleanup

### Frontend (`client/test/`)
- `HomePage.test.jsx` — renders, start sharing click, permission denied flow
- `SessionPage.test.jsx` — host view render, viewer view render, invalid session redirect
- `HostView.test.jsx` — link display, copy button, stop sharing
- `ViewerView.test.jsx` — video element present, overlay states
- `useCreateSession.test.js` — success, error, loading states
- `useSession.test.js` — valid session, 404, expired

---

## Phase 7 — Deployment

### Backend (Heroku paid dyno)
- Add `Procfile`: `web: node server/index.js`
- Add `engines` in `package.json` for Node version
- Set all env vars via Heroku Config Vars
- MongoDB: MongoDB Atlas free tier, connect via `MONGODB_URI`
- CORS: set `CLIENT_URL` to production frontend domain

### Frontend (Vercel or Netlify)
- Set `VITE_API_URL` and `VITE_SOCKET_URL` to Heroku backend URL
- `vite.config.js` no changes needed for production

### HTTPS/WSS
- Heroku provides HTTPS by default
- Socket.IO auto-upgrades to WSS on HTTPS origins
- `getDisplayMedia` requires a secure context — verified by HTTPS

---

## Key Implementation Rules (from CLAUDE.md)

| Rule | Application |
|------|-------------|
| No hardcoded URLs | All API + socket URLs from `VITE_API_URL` / `VITE_SOCKET_URL` |
| Centralised API client | All HTTP calls go through `client/src/lib/api.js` |
| Standard response envelope | All backend responses use `{ success, data, message }` |
| Rate limit sensitive routes | `POST /api/sessions`, `DELETE /api/sessions/:id` |
| Null safety | Session data, ICE candidates, stream tracks all guarded |
| Idempotency | Session creation checks for existing active session per socket |
| Error middleware | One centralised Express error handler, no silent swallows |
| Env fail-fast | `server/config/env.js` throws on startup if required vars missing |
| No direct `process.env` | All backend env access through `config/env.js` |

---

## Build Phase Summary

| Phase | Deliverable | Done When |
|-------|-------------|-----------|
| 1 | Project setup | Both dev servers run, `/api/health` works |
| 2 | Session API + DB | CRUD routes pass, TTL deletes expired docs |
| 3 | Socket signaling | Two clients relay SDP + ICE via server room |
| 4 | WebRTC stream | Live screen share from host to viewer |
| 5 | Edge cases | All failure states handled with correct UI |
| 6 | Tests | Unit + integration coverage across happy + edge paths |
| 7 | Deploy | Live on HTTPS with production env vars |

---

## Success Criteria

- [ ] Host screen share starts in < 5 seconds
- [ ] Viewer joins with one click, no login or install
- [ ] P2P stream is stable with no server video processing
- [ ] Session end cleans up both sides cleanly
- [ ] All edge cases surface user-friendly UI, not blank screens or crashes
