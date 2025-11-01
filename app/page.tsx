'use client';
import AppGate from '@/components/AppGate';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Home() {
  return (
    <main className="min-h-screen">
      <ProtectedRoute>
        <AppGate />
      </ProtectedRoute>
    </main>
  );
}
