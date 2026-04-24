export default function BrowserGuard({ children }) {
  const supported =
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function';

  if (!supported) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-white text-xl font-semibold mb-2">Browser not supported</h2>
          <p className="text-gray-400 text-sm">
            LinkScreen requires screen sharing support. Please use Chrome, Edge, or Firefox.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
