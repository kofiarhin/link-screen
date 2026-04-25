import React from 'react';
export default function BrowserGuard({ role = 'host', children }) {
  const hasRtc = typeof window !== 'undefined' && typeof window.RTCPeerConnection === 'function';
  const hasMedia =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function';

  const supported = role === 'host' ? hasRtc && hasMedia : hasRtc;

  if (!supported) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-white text-xl font-semibold mb-2">Browser not supported</h2>
          <p className="text-gray-400 text-sm">
            {role === 'host'
              ? 'Hosting requires screen sharing and WebRTC support. Use Chrome, Edge, or Firefox.'
              : 'Viewing requires WebRTC support. Use a modern Chrome, Edge, or Firefox browser.'}
          </p>
        </div>
      </div>
    );
  }

  return children;
}
