export const SOCKET_EVENTS = {
  HOST_JOIN: 'host:join',
  VIEWER_JOIN: 'viewer:join',
  VIEWER_READY: 'viewer:ready',
  OFFER: 'webrtc:offer',
  ANSWER: 'webrtc:answer',
  ICE_CANDIDATE: 'webrtc:ice-candidate',
  SESSION_END: 'session:end',
  ERROR: 'session:error',
};

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const RECONNECT_TIMEOUT_MS = 15000;
