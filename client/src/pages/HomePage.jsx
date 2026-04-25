import React from 'react';
import { useCreateSession } from '../hooks/mutations/useCreateSession';

export default function HomePage() {
  const { mutate: startSession, isPending, error } = useCreateSession();

  const handleStart = () => {
    startSession(undefined, {
      onSuccess: (data) => {
        window.location.assign(data.hostUrl);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-2">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">LinkScreen</h1>
          <p className="text-gray-400 text-base">
            Share your screen instantly. No account. No install.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2">
            Failed to create session. Please try again.
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={isPending}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed
                     text-white font-semibold text-lg rounded-2xl transition-colors shadow-lg shadow-indigo-600/20"
        >
          {isPending ? 'Setting up…' : 'Start Sharing'}
        </button>

        <p className="text-gray-600 text-xs">
          A unique link will be generated. Share it with one person to begin.
        </p>
      </div>
    </div>
  );
}
