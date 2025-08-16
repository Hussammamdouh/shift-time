'use client';

import Link from 'next/link';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 mx-auto border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-red-400">Error</h1>
          <h2 className="text-2xl font-semibold text-slate-200">Something went wrong!</h2>
          <p className="text-slate-400 text-lg">An unexpected error occurred.</p>
          <div className="space-y-3">
            <button
              onClick={reset}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium rounded-xl hover:from-violet-700 hover:to-cyan-700 transition-all duration-300 shadow-glow mr-3"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
            <Link 
              href="/" 
              className="inline-flex items-center px-6 py-3 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
