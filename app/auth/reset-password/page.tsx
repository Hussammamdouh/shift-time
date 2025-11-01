'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { PageLoader } from '@/components/LoadingSpinner';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    // Get the oobCode from URL query parameters
    // Firebase uses 'oobCode' or 'mode' + 'oobCode'
    const code = searchParams.get('oobCode') || searchParams.get('code');
    const mode = searchParams.get('mode');
    
    if (code && (mode === 'resetPassword' || !mode)) {
      setOobCode(code);
    } else if (!code) {
      setError('Invalid or missing reset code. Please request a new password reset.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!oobCode) {
      setError('Reset code is missing');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(oobCode, formData.password);
      setSuccess('Password reset successfully! Redirecting to login...');
      
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. The link may have expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!oobCode && !error) {
    return <PageLoader text="Loading reset password form..." />;
  }

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
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient ribbon inline-block">New Password</h2>
              <p className="text-slate-400 mt-2 text-sm sm:text-base">Enter your new password below</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm animate-in slide-up duration-300">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p>{error}</p>
                    {error.includes('expired') && (
                      <a href="/auth/forgot-password" className="text-red-400 hover:text-red-300 text-xs mt-1 block underline">
                        Request a new reset link
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm animate-in slide-up duration-300">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{success}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="form-label">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
                disabled={!!success}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input"
                placeholder="Confirm new password"
                minLength={6}
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
                  <span>Resetting password...</span>
                </div>
              ) : success ? (
                'Password Reset'
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-slate-700/50">
            <a href="/auth/login" className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors duration-200">
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading reset password form..." />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

