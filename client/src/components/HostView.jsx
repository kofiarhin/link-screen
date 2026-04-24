import { useEffect, useRef } from 'react';
import LinkCard from './LinkCard';

export default function HostView({ stream, sessionLink, viewerConnected, onStop }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 gap-6">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Live</span>
          </div>
          <span className="text-gray-500 text-sm">
            {viewerConnected ? '1 viewer connected' : 'Waiting for viewer…'}
          </span>
        </div>

        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video w-full shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
          {!viewerConnected && (
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
