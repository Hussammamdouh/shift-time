'use client';

import { useEffect, useState } from 'react';
import { isQuotaExceededError } from '@/lib/firebase';

interface FirebaseErrorHandlerProps {
  children: React.ReactNode;
}

export default function FirebaseErrorHandler({ children }: FirebaseErrorHandlerProps) {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Global error handler for Firebase quota exceeded
    const handleError = (event: ErrorEvent) => {
      if (isQuotaExceededError(event.error)) {
        const errorMessage = 'Firebase quota exceeded. Some features may be limited.';
        setErrors(prev => [...prev, errorMessage]);
        
        // Remove error after 10 seconds
        setTimeout(() => {
          setErrors(prev => prev.filter(err => err !== errorMessage));
        }, 10000);
      }
    };

    // Global unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isQuotaExceededError(event.reason)) {
        const errorMessage = 'Firebase quota exceeded. Some features may be limited.';
        setErrors(prev => [...prev, errorMessage]);
        
        // Remove error after 10 seconds
        setTimeout(() => {
          setErrors(prev => prev.filter(err => err !== errorMessage));
        }, 10000);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      {children}
      
      {/* Error notifications */}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg max-w-md"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setErrors(prev => prev.filter((_, i) => i !== index))}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
