# LinkScreen Project Brief

## Overview
LinkScreen is a lightweight, browser-based, peer-to-peer screen sharing application that allows a user to instantly share their screen with another person via a unique link. No downloads, no accounts, no friction.

## Core Objective
Enable one-click screen sharing where:
- Host generates a link
- Viewer clicks and instantly sees the host’s screen
- Runs entirely in-browser using WebRTC

## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- WebRTC (native browser API)

### Backend (Signaling Server)
- Node.js
- Express
- WebSocket (Socket.IO recommended)
- Hosted on Heroku (paid dyno)

## Core Features

### Session Creation (Host)
- User clicks “Start Sharing”
- Requests screen capture via getDisplayMedia
- Generates a unique session ID
- Creates a secure shareable link

Example:
https://linkscreen.app/session/abc123

### Viewer Join Flow
- Viewer opens link
- Connects to signaling server
- Establishes WebRTC connection
- Displays live screen stream

### Real-Time Screen Streaming
- Uses WebRTC peer-to-peer connection
- Video stream flows directly between users

### Session Lifecycle
- Host controls start/stop
- On stop:
  - Connection closes
  - Viewer sees “Session Ended”
  - Session becomes invalid

## Architecture Flow
1. Host creates session → backend generates session ID
2. Host shares link
3. Viewer joins via link
4. Signaling server exchanges SDP + ICE
5. WebRTC connection established
6. Stream begins
7. Session ends → cleanup

## Edge Cases

### Network Instability
- Detect drops
- Attempt reconnection (ICE restart)
- UI: “Reconnecting…”

### Abrupt Disconnection
- Viewer notified if host leaves
- Clean teardown

### Permission Denied
- Show retry UI

### Invalid / Expired Links
- Time-limited sessions
- Error message shown

### Security
- Secure session IDs
- Optional expiry + one-time use

### Browser Compatibility
- Chrome, Edge, Firefox
- Block unsupported browsers

## Non-Functional Requirements

### Performance
- Low latency (<300ms)
- No server video processing

### Scalability
- MVP: 1:1
- Future: SFU for multi-user

### Cost
- WebRTC free
- Only backend hosting cost

## Future Enhancements
- Multi-viewer
- Audio sharing
- Chat
- Recording
- Annotations
- Password protection

## Success Criteria
- Share in <5 seconds
- One-click join
- No install/login
- Stable connection

## Summary
LinkScreen is a fast, minimal, no-friction screen sharing tool built on WebRTC.
