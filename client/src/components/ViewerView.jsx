import { useEffect, useRef } from 'react';
import StatusOverlay from './StatusOverlay';

export default function ViewerView({ stream, status, onRetry }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showOverlay = status !== 'streaming';

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
      {showOverlay && <StatusOverlay state={status} onRetry={onRetry} />}
    </div>
  );
}
