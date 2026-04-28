import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { Briefing } from '@/lib/types';
import { listLeads, listJobs, listInvoices, listReviews, computeStats, getUserById, logAI } from '@/lib/db';
import { dailyBriefing } from '@/lib/ai';
import { requireUser } from '@/lib/session';

const CACHE_KEY = (userId: string, date: string) => `briefing:${userId}:${date}`;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const { userId } = await requireUser();
    const cached = (await redis.get(CACHE_KEY(userId, todayKey()))) as Briefing | null;
    return NextResponse.json({ briefing: cached });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST() {
  try {
    const { userId } = await requireUser();
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [leads, jobs, invoices, reviews, stats] = await Promise.all([
      listLeads(userId),
      listJobs(userId),
      listInvoices(userId),
      listReviews(userId),
      computeStats(userId),
    ]);

    const dayMs = 86_400_000;
    const newLeads = leads.filter((l) => Date.now() - l.createdAt < dayMs);
    const staleLeads = leads.filter((l) =>
      (l.status === 'new' || l.status === 'quoted') && Date.now() - l.updatedAt > 3 * dayMs
    );
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const todayJobs = jobs.filter((j) => j.scheduledFor >= today.getTime() && j.scheduledFor < tomorrow.getTime());
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue' || (i.status === 'sent' && i.dueDate && i.dueDate < Date.now()));
    const newReviews = reviews.filter((r) => Date.now() - r.createdAt < dayMs);

    const text = await dailyBriefing({
      businessName: user.businessName,
      trade: user.trade,
      stats,
      newLeads,
      staleLeads,
      todayJobs,
      overdueInvoices,
      newReviews,
    });

    const briefing: Briefing = { text, generatedAt: Date.now(), date: todayKey() };
    // Cache for ~12 hours
    await redis.set(CACHE_KEY(userId, todayKey()), briefing, { ex: 60 * 60 * 12 });

    await logAI(userId, { type: 'briefing', summary: 'Daily briefing generated' });

    return NextResponse.json({ briefing });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
