import { NextResponse } from 'next/server';
import { listCustomers, listJobs, listReviews, getUserById, logAI } from '@/lib/db';
import { customerInsights } from '@/lib/ai';
import { requireUser } from '@/lib/session';

export async function POST() {
  try {
    const { userId } = await requireUser();
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [customers, jobs, reviews] = await Promise.all([
      listCustomers(userId),
      listJobs(userId),
      listReviews(userId),
    ]);

    if (customers.length === 0 && jobs.length === 0) {
      return NextResponse.json({ insights: 'Not enough data yet. Complete some jobs and add customers to see insights.' });
    }

    const insights = await customerInsights({
      businessName: user.businessName,
      trade: user.trade,
      customers,
      jobs,
      reviews,
    });

    await logAI(userId, { type: 'pricing', summary: 'Customer insights generated' });
    return NextResponse.json({ insights });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
