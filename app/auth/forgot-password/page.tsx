'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendPasswordReset } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await sendPasswordReset(email);
      setSuccess('Password reset email sent! Check your inbox for instructions.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 aurora-bg">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -left-16 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 right-0 w-[28rem] h-[28rem] bg-cyan-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="card space-y-8 animate-in fade-in-scale duration-500">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-glow pulse-glow mx-auto">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient ribbon inline-block">Reset Password</h2>
              <p className="text-slate-400 mt-2 text-sm sm:text-base">Enter your email to receive a password reset link</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm animate-in slide-up duration-300">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm animate-in slide-up duration-300">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium mb-1">{success}</p>
                    <p className="text-xs text-emerald-400">
                      If you don&apos;t see the email, check your spam folder.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
                disabled={!!success}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </div>
              ) : success ? (
                'Email Sent'
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-slate-700/50 space-y-2">
            <a href="/auth/login" className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors duration-200 block">
              Back to Sign In
            </a>
            <p className="text-slate-400 text-xs">
              Don&apos;t have an account?{' '}
              <a href="/auth/register" className="text-violet-400 hover:text-violet-300 font-medium">
                Create one here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

