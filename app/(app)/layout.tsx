import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Sidebar from '@/components/Sidebar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.userId) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar businessName={session.businessName || 'Your Business'} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
