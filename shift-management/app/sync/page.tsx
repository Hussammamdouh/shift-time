'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main page with sync tab
    router.replace('/?tab=sync');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>Redirecting to sync...</p>
      </div>
    </div>
  );
}
