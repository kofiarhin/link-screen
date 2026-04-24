# LinkScreen Full Implementation Spec

## 1. Project Name
LinkScreen

## 2. Core Goal
Allow a host to share their screen with one viewer using a secure link.

## 3. MVP Scope
### Included
- Host creates session
- Unique secure link
- Viewer joins
- WebRTC P2P stream
- Socket signaling
- Session expiration
- Clean teardown

### Excluded
- Multi-viewer
- Recording
- Auth

## 4. Tech Stack
### Frontend
- React (Vite)
- Tailwind
- WebRTC
- Socket.IO Client

### Backend
- Node.js
- Express
- Socket.IO

## 5. Folder Structure
(See full spec in original doc)

## 6. User Flow
### Host
1. Start sharing
2. Generate link
3. Share link
4. Stream begins
5. Stop session

### Viewer
1. Open link
2. Connect
3. Watch stream
4. Session ends

## 7. API
POST /api/sessions
GET /api/sessions/:id
DELETE /api/sessions/:id

## 8. Socket Events
host:join
viewer:join
webrtc:offer
webrtc:answer
webrtc:ice-candidate
session:end

## 9. WebRTC
- getDisplayMedia
- RTCPeerConnection
- ICE + SDP exchange

## 10. Edge Cases
- Network drop → reconnect
- Host disconnect → end session
- Permission denied → retry
- Invalid session → error UI

## 11. Security
- HTTPS/WSS
- Secure session IDs
- Expiry enforcement

## 12. Env
Backend:
PORT=5000
CLIENT_URL=http://localhost:5173

Frontend:
VITE_API_URL=http://localhost:5000

## 13. Build Phases
1. Setup
2. Sessions
3. Signaling
4. WebRTC
5. Edge cases
6. Deploy

## 14. Success Criteria
- Share in <5s
- One-click join
- Stable 1:1 stream

## 15. Future
- Multi-user
- Chat
- Recording
