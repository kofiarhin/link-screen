import { useState } from 'react';
import { copyToClipboard } from '../utils/clipboard';

export default function LinkCard({ link }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard failure is non-critical
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 w-full max-w-lg">
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
        Share this link
      </p>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-gray-200 text-sm font-mono truncate bg-gray-900 px-3 py-2 rounded-lg">
          {link}
        </span>
        <button
          onClick={handleCopy}
          className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
