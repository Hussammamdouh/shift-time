import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 mx-auto border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold gradient-text-animate">404</h1>
          <h2 className="text-2xl font-semibold text-slate-200">Page Not Found</h2>
          <p className="text-slate-400 text-lg">The page you&apos;re looking for doesn&apos;t exist.</p>
          <Link 
            href="/" 
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium rounded-xl hover:from-violet-700 hover:to-cyan-700 transition-all duration-300 shadow-glow"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
