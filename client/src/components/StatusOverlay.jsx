import React from 'react';
const STATES = {
  validating: {
    icon: (
      <svg className="animate-spin h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    ),
    title: 'Validating Session…',
    subtitle: 'Checking session availability',
  },
  connecting: {
    icon: (
      <svg className="animate-spin h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    ),
    title: 'Connecting…',
    subtitle: 'Waiting for host stream',
  },
  reconnecting: {
    icon: (
      <svg className="animate-spin h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    ),
    title: 'Reconnecting…',
    subtitle: 'Attempting to restore connection',
  },
  ended: {
    icon: <span className="text-4xl">📺</span>,
    title: 'Session Ended',
    subtitle: 'The host has stopped sharing.',
  },
  error: {
    icon: <span className="text-4xl">⚠️</span>,
    title: 'Connection Failed',
    subtitle: 'Could not establish a connection.',
  },
  invalid: {
    icon: <span className="text-4xl">🔗</span>,
    title: 'Invalid Session',
    subtitle: 'This link is expired or does not exist.',
  },
  full: {
    icon: <span className="text-4xl">👥</span>,
    title: 'Session Full',
    subtitle: 'Another viewer is already connected.',
  },
};

export default function StatusOverlay({ state, onRetry }) {
  const config = STATES[state];
  if (!config) return null;

  return (
    <div className="absolute inset-0 bg-gray-950/90 flex items-center justify-center z-10">
      <div className="text-center space-y-3">
        <div className="flex justify-center">{config.icon}</div>
        <p className="text-white text-lg font-semibold">{config.title}</p>
        <p className="text-gray-400 text-sm">{config.subtitle}</p>
        {onRetry && state === 'error' && (
          <button
            onClick={onRetry}
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
