import React from 'react';
import { useEffect, useRef } from 'react';
import LinkCard from './LinkCard';

export default function HostView({ stream, sessionLink, status, onStop, onRetry }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (status === 'creating' || status === 'permission-request') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-300 text-sm">Preparing session…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-white text-xl font-semibold">Screen sharing error</h2>
          <p className="text-gray-400 text-sm">Please allow screen access and try again.</p>
          <button
            onClick={onRetry}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusLabel = {
    'waiting-for-viewer': 'Waiting for viewer…',
    'viewer-connected': '1 viewer connected',
    'viewer-left': 'Viewer disconnected. Waiting for new viewer…',
    reconnecting: 'Reconnecting…',
    ended: 'Session ended',
  }[status] || 'Waiting for viewer…';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 gap-6">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Live</span>
          </div>
          <span className="text-gray-500 text-sm">{statusLabel}</span>
        </div>

        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video w-full shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
          {status !== 'viewer-connected' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <p className="text-gray-400 text-sm">Share the link below to start streaming</p>
            </div>
          )}
        </div>

        <LinkCard link={sessionLink} />

        <button
          onClick={onStop}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors"
        >
          Stop Sharing
        </button>
      </div>
    </div>
  );
}
