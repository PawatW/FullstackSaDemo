'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../components/AppShell';
import { useAuth } from '../../components/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">กำลังตรวจสอบสิทธิ์...</div>;
  }

  if (!isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">กำลังตรวจสอบสิทธิ์...</div>;
  }

  return <AppShell>{children}</AppShell>;
}
