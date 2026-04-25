import React from 'react';
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
import BrowserGuard from '../components/BrowserGuard';

export default function SessionPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hostToken = searchParams.get('hostToken');
  const isHost = Boolean(hostToken);

  const { data: sessionData, isLoading, isError } = useSession(!isHost ? id : null);

  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hostStatus, setHostStatus] = useState('creating');
  const [viewerStatus, setViewerStatus] = useState('validating');

  const pcRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const startedRef = useRef(false);
  const sessionLink = `${window.location.origin}/session/${id}`;

  const listenerRefs = useRef({});

  const clearListeners = useCallback(() => {
    const listeners = listenerRefs.current;
    Object.entries(listeners).forEach(([event, handler]) => {
      socket.off(event, handler);
    });
    listenerRefs.current = {};
  }, []);

  const cleanup = useCallback(() => {
    clearListeners();

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    socket.disconnect();
    clearTimeout(reconnectTimerRef.current);
  }, [clearListeners, stream]);

  const handleStop = useCallback(async () => {
    try {
      await endSession(id);
    } catch {
      // non-critical
    }

    socket.emit(SOCKET_EVENTS.SESSION_END, { sessionId: id });
    setHostStatus('ended');
    cleanup();
    navigate('/');
  }, [id, cleanup, navigate]);

  const setupHostSocketHandlers = useCallback((pc) => {
    const handleViewerReady = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit(SOCKET_EVENTS.OFFER, { sessionId: id, sdp: pc.localDescription });
    };

    const handleAnswer = async ({ sdp }) => {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // non-critical
      }
    };

    const handleViewerLeft = () => {
      setHostStatus('viewer-left');
    };

    const handleSocketError = ({ message }) => {
      console.error('Host socket error:', message);
      setHostStatus('error');
    };

    listenerRefs.current[SOCKET_EVENTS.VIEWER_READY] = handleViewerReady;
    listenerRefs.current[SOCKET_EVENTS.ANSWER] = handleAnswer;
    listenerRefs.current[SOCKET_EVENTS.ICE_CANDIDATE] = handleIceCandidate;
    listenerRefs.current[SOCKET_EVENTS.VIEWER_LEFT] = handleViewerLeft;
    listenerRefs.current[SOCKET_EVENTS.ERROR] = handleSocketError;

    socket.on(SOCKET_EVENTS.VIEWER_READY, handleViewerReady);
    socket.on(SOCKET_EVENTS.ANSWER, handleAnswer);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);
    socket.on(SOCKET_EVENTS.VIEWER_LEFT, handleViewerLeft);
    socket.on(SOCKET_EVENTS.ERROR, handleSocketError);
  }, [id]);

  const startHostSession = useCallback(async () => {
    setHostStatus('permission-request');

    let capturedStream;
    try {
      capturedStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setStream(capturedStream);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setHostStatus('error');
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
        setHostStatus('reconnecting');
        reconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current?.connectionState !== 'connected') {
            setHostStatus('error');
          }
        }, RECONNECT_TIMEOUT_MS);
      } else if (state === 'connected') {
        clearTimeout(reconnectTimerRef.current);
        setHostStatus('viewer-connected');
      } else if (state === 'failed') {
        setHostStatus('error');
      }
    };

    socket.connect();
    setupHostSocketHandlers(pc);
    socket.emit(SOCKET_EVENTS.HOST_JOIN, { sessionId: id, hostToken });
    setHostStatus('waiting-for-viewer');

    capturedStream.getVideoTracks()[0]?.addEventListener('ended', handleStop);
  }, [hostToken, id, handleStop, setupHostSocketHandlers]);

  const setupViewerSocketHandlers = useCallback((pc, rs) => {
    const handleOffer = async ({ sdp }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(SOCKET_EVENTS.ANSWER, { sessionId: id, sdp: pc.localDescription });
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // non-critical
      }
    };

    const handleSessionEnd = () => {
      setViewerStatus('ended');
      cleanup();
    };

    const handleSocketError = ({ message }) => {
      if (message === 'Session is full') {
        setViewerStatus('full');
        return;
      }
      setViewerStatus('invalid');
    };

    listenerRefs.current[SOCKET_EVENTS.OFFER] = handleOffer;
    listenerRefs.current[SOCKET_EVENTS.ICE_CANDIDATE] = handleIceCandidate;
    listenerRefs.current[SOCKET_EVENTS.SESSION_END] = handleSessionEnd;
    listenerRefs.current[SOCKET_EVENTS.ERROR] = handleSocketError;

    socket.on(SOCKET_EVENTS.OFFER, handleOffer);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);
    socket.on(SOCKET_EVENTS.SESSION_END, handleSessionEnd);
    socket.on(SOCKET_EVENTS.ERROR, handleSocketError);

    pc.ontrack = ({ track }) => {
      rs.addTrack(track);
      setViewerStatus('watching');
    };
  }, [cleanup, id]);

  const startViewerSession = useCallback(() => {
    const pc = createPeerConnection();
    pcRef.current = pc;

    const rs = new MediaStream();
    setRemoteStream(rs);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, { sessionId: id, candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'disconnected') {
        setViewerStatus('reconnecting');
      } else if (state === 'connected') {
        clearTimeout(reconnectTimerRef.current);
        setViewerStatus('watching');
      } else if (state === 'failed') {
        setViewerStatus('error');
      }
    };

    socket.connect();
    setupViewerSocketHandlers(pc, rs);
    socket.emit(SOCKET_EVENTS.VIEWER_JOIN, { sessionId: id });
    setViewerStatus('connecting');
  }, [id, setupViewerSocketHandlers]);

  const handleViewerRetry = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    clearListeners();
    setViewerStatus('connecting');
    startViewerSession();
  }, [clearListeners, startViewerSession]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (isHost) {
      startHostSession();
    }

    return cleanup;
  }, [cleanup, isHost, startHostSession]);

  useEffect(() => {
    if (isHost) return;
    if (!sessionData) {
      if (isLoading) {
        setViewerStatus('validating');
      } else if (isError) {
        setViewerStatus('invalid');
      }
      return;
    }

    startViewerSession();
    return cleanup;
  }, [isError, isHost, isLoading, sessionData, startViewerSession, cleanup]);

  if (isHost) {
    return (
      <BrowserGuard role="host">
        <HostView
          stream={stream}
          sessionLink={sessionLink}
          status={hostStatus}
          onStop={handleStop}
          onRetry={startHostSession}
        />
      </BrowserGuard>
    );
  }

  return (
    <BrowserGuard role="viewer">
      <ViewerView
        stream={remoteStream}
        status={viewerStatus}
        onRetry={handleViewerRetry}
      />
    </BrowserGuard>
  );
}
