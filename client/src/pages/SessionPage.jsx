import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/queries/useSession';
import { endSession } from '../services/sessionService';
import { createPeerConnection } from '../lib/webrtc';
import socket from '../lib/socket';
import { SOCKET_EVENTS, RECONNECT_TIMEOUT_MS } from '../constants/constants';
import HostView from '../components/HostView';
import ViewerView from '../components/ViewerView';
import StatusOverlay from '../components/StatusOverlay';

export default function SessionPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isHost = searchParams.get('role') === 'host';

  const { data: sessionData, isLoading, isError } = useSession(!isHost ? id : null);

  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [viewerConnected, setViewerConnected] = useState(false);
  const [viewerStatus, setViewerStatus] = useState('connecting');
  const [permissionError, setPermissionError] = useState(false);

  const pcRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const sessionLink = `${window.location.origin}/session/${id}`;

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    socket.disconnect();
    clearTimeout(reconnectTimerRef.current);
  }, [stream]);

  // ── HOST FLOW ──────────────────────────────────────────────────────────────
  const startHostSession = useCallback(async () => {
    let capturedStream;
    try {
      capturedStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setStream(capturedStream);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermissionError(true);
        return;
      }
      return;
    }

    const pc = createPeerConnection();
    pcRef.current = pc;

    capturedStream.getTracks().forEach((track) => pc.addTrack(track, capturedStream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, { sessionId: id, candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'disconnected') {
        reconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current?.connectionState !== 'connected') {
            cleanup();
            navigate('/');
          }
        }, RECONNECT_TIMEOUT_MS);
      } else if (state === 'connected') {
        clearTimeout(reconnectTimerRef.current);
        setViewerConnected(true);
      } else if (state === 'failed') {
        cleanup();
        navigate('/');
      }
    };

    socket.connect();
    socket.emit(SOCKET_EVENTS.HOST_JOIN, { sessionId: id });

    socket.on(SOCKET_EVENTS.VIEWER_READY, async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit(SOCKET_EVENTS.OFFER, { sessionId: id, sdp: pc.localDescription });
    });

    socket.on(SOCKET_EVENTS.ANSWER, async ({ sdp }) => {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // non-critical
      }
    });

    // Host ended session from another tab / stream track ended
    capturedStream.getVideoTracks()[0]?.addEventListener('ended', handleStop);
  }, [id, cleanup, navigate]);

  const handleStop = useCallback(async () => {
    try {
      await endSession(id);
    } catch {
      // non-critical
    }
    socket.emit(SOCKET_EVENTS.SESSION_END, { sessionId: id });
    cleanup();
    navigate('/');
  }, [id, cleanup, navigate]);

  // ── VIEWER FLOW ────────────────────────────────────────────────────────────
  const startViewerSession = useCallback(() => {
    const pc = createPeerConnection();
    pcRef.current = pc;

    const rs = new MediaStream();
    setRemoteStream(rs);

    pc.ontrack = ({ track }) => {
      rs.addTrack(track);
      setViewerStatus('streaming');
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, { sessionId: id, candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'disconnected') {
        setViewerStatus('reconnecting');
        reconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current?.connectionState !== 'connected') {
            setViewerStatus('error');
          }
        }, RECONNECT_TIMEOUT_MS);
      } else if (state === 'connected') {
        clearTimeout(reconnectTimerRef.current);
        setViewerStatus('streaming');
      } else if (state === 'failed') {
        setViewerStatus('error');
      }
    };

    socket.connect();
    socket.emit(SOCKET_EVENTS.VIEWER_JOIN, { sessionId: id });

    socket.on(SOCKET_EVENTS.OFFER, async ({ sdp }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(SOCKET_EVENTS.ANSWER, { sessionId: id, sdp: pc.localDescription });
    });

    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // non-critical
      }
    });

    socket.on(SOCKET_EVENTS.SESSION_END, () => {
      setViewerStatus('ended');
      cleanup();
    });

    socket.on(SOCKET_EVENTS.ERROR, ({ message }) => {
      console.error('Socket error:', message);
      setViewerStatus('invalid');
    });
  }, [id, cleanup]);

  const handleViewerRetry = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setViewerStatus('connecting');
    startViewerSession();
  }, [startViewerSession]);

  // ── MOUNT ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHost) {
      startHostSession();
    }
    return cleanup;
  }, [isHost]);

  useEffect(() => {
    if (!isHost && sessionData) {
      startViewerSession();
    }
    return () => {
      if (!isHost) cleanup();
    };
  }, [isHost, sessionData]);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  if (!isHost) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <StatusOverlay state="connecting" />
        </div>
      );
    }
    if (isError || !sessionData) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <StatusOverlay state="invalid" />
        </div>
      );
    }
  }

  if (isHost) {
    if (permissionError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
            <div className="text-4xl">🖥️</div>
            <h2 className="text-white text-xl font-semibold">Screen access denied</h2>
            <p className="text-gray-400 text-sm">
              LinkScreen needs permission to capture your screen.
            </p>
            <button
              onClick={() => { setPermissionError(false); startHostSession(); }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (!stream) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center space-y-3">
            <svg className="animate-spin h-8 w-8 text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-gray-400 text-sm">Waiting for screen permission…</p>
          </div>
        </div>
      );
    }

    return (
      <HostView
        stream={stream}
        sessionLink={sessionLink}
        viewerConnected={viewerConnected}
        onStop={handleStop}
      />
    );
  }

  return (
    <ViewerView
      stream={remoteStream}
      status={viewerStatus}
      onRetry={handleViewerRetry}
    />
  );
}
