'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { PageLoader } from './LoadingSpinner';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
      } else if (!isAdmin) {
        router.push('/');
      }
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
    return <PageLoader text="Loading dashboard..." />;
  }

  if (!user || !isAdmin) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

