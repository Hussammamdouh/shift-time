'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PageLoader } from '@/components/LoadingSpinner';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

function ProfileContent() {
  const { user, userProfile, company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        email: userProfile.email || '',
      });
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!user || !userProfile || !db || !auth) {
        throw new Error('User not authenticated');
      }

      // Update Firebase Auth profile
      if (formData.displayName !== userProfile.displayName) {
        await updateProfile(user, {
          displayName: formData.displayName,
        });
      }

      // Update Firestore user profile
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName,
        updatedAt: serverTimestamp(),
      });

      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        window.location.reload(); // Reload to get updated profile
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
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

  if (!userProfile) {
    return <PageLoader text="Loading profile..." />;
  }

  const initials = (userProfile.displayName || userProfile.email)
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 lg:h-20 py-4 sm:py-0 gap-4 sm:gap-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-glow pulse-glow">
                <svg className="w-7 h-7 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text-animate ribbon">
                  My Profile
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-slate-400 hidden sm:block">
                  Manage your account information
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <Link href="/dashboard" className="btn btn-ghost btn-sm flex-1 sm:flex-none">
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </Link>
              <Link href="/" className="btn btn-secondary btn-sm flex-1 sm:flex-none">
                <span className="hidden sm:inline">Back to App</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Picture / Avatar Section */}
          <div className="card text-center">
            <div className="mb-6">
              <div className="w-32 h-32 bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto shadow-glow pulse-glow">
                {initials}
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-2">
              {userProfile.displayName || userProfile.email}
            </h2>
            <p className="text-sm text-slate-400 mb-4">{userProfile.email}</p>
            
            <div className="space-y-3 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Role</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  userProfile.role === 'admin'
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {userProfile.role === 'admin' ? 'Admin' : 'Employee'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Company</span>
                <span className="text-slate-300 font-medium">{company?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Member Since</span>
                <span className="text-slate-300">
                  {new Date(userProfile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Edit Form */}
          <div className="lg:col-span-2 card">
            <h2 className="text-2xl font-bold text-slate-200 mb-6">Edit Profile</h2>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm mb-6">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm mb-6">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{success}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="displayName" className="form-label">
                  Full Name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={handleChange}
                  className="input"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="input opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500">
                  Email cannot be changed. Contact your admin if you need to change your email address.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-700/50">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>

            {/* Additional Actions */}
            <div className="mt-8 pt-6 border-t border-slate-700/50 space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">Account Actions</h3>
              
              <Link href="/?tab=settings" className="block w-full btn btn-ghost text-left">
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Change Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

