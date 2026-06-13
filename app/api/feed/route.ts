import { NextRequest, NextResponse } from 'next/server';
import {
  getUserById,
  getUserByEmail,
  listLeads,
  listCustomers,
  listJobs,
  listInvoices,
  listReviews,
  listActivity,
  computeStats,
} from '@/lib/db';

// Read-only data export for trusted automation (the Revenue / Pipeline Engine).
// Auth: Authorization: Bearer <EXPORT_TOKEN>. Never uses the user session cookie.
// This route only READS data — it never mutates anything.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Constant-time-ish token comparison to avoid trivial timing leaks.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function GET(req: NextRequest) {
  const expected = process.env.EXPORT_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: 'Export not configured' }, { status: 503 });
  }

  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve which account to export. Priority: ?userId → ?email → EXPORT_USER_ID env default.
  const url = new URL(req.url);
  const qUserId = url.searchParams.get('userId') || undefined;
  const qEmail = url.searchParams.get('email') || undefined;

  let userId = qUserId || process.env.EXPORT_USER_ID || undefined;
  if (!userId && qEmail) {
    const u = await getUserByEmail(qEmail);
    if (u) userId = u.id;
  }
  if (!userId) {
    return NextResponse.json(
      { error: 'No account specified. Pass ?userId= or ?email=, or set EXPORT_USER_ID.' },
      { status: 400 }
    );
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [leads, customers, jobs, invoices, reviews, activity, stats] = await Promise.all([
    listLeads(userId),
    listCustomers(userId),
    listJobs(userId),
    listInvoices(userId),
    listReviews(userId),
    listActivity(userId, 100),
    computeStats(userId),
  ]);

  // Strip the email field on reviews/customers? Keep — this is the owner's own data,
  // accessed only with the secret token. Return a clean, analysis-ready snapshot.
  return NextResponse.json(
    {
      exportedAt: Date.now(),
      account: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        trade: user.trade,
      },
      stats,
      counts: {
        leads: leads.length,
        customers: customers.length,
        jobs: jobs.length,
        invoices: invoices.length,
        reviews: reviews.length,
      },
      leads,
      customers,
      jobs,
      invoices,
      reviews,
      recentActivity: activity,
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
