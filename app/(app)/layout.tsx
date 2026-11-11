import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { isVerifiedSession } from '@/lib/auth-core';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!isVerifiedSession(session)) redirect('/login');
  return <AppShell businessName={session.businessName || 'Your Business'}>{children}</AppShell>;
}
