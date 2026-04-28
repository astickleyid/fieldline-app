import { NextRequest, NextResponse } from 'next/server';
import { listLeads, listJobs, listCustomers, listInvoices } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const range = req.nextUrl.searchParams.get('range') || '30d';

    const [leads, jobs, customers, invoices] = await Promise.all([
      listLeads(userId),
      listJobs(userId),
      listCustomers(userId),
      listInvoices(userId),
    ]);

    const now = Date.now();
    const dayMs = 86_400_000;
    const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : range === '365d' ? 365 : 30;
    const cutoff = now - rangeDays * dayMs;

    // Revenue by day
    const revenueByDay: { date: string; revenue: number }[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const day = new Date(now - i * dayMs);
      day.setHours(0, 0, 0, 0);
      const dayEnd = day.getTime() + dayMs;
      const revenue = jobs
        .filter((j) => j.status === 'completed' && j.scheduledFor >= day.getTime() && j.scheduledFor < dayEnd)
        .reduce((s, j) => s + j.value, 0);
      revenueByDay.push({ date: day.toISOString().slice(0, 10), revenue });
    }

    // Conversion funnel
    const funnel = {
      new: leads.filter((l) => l.createdAt >= cutoff).length,
      quoted: leads.filter((l) => l.status === 'quoted' || l.status === 'booked' || l.status === 'completed').filter((l) => l.createdAt >= cutoff).length,
      booked: leads.filter((l) => l.status === 'booked' || l.status === 'completed').filter((l) => l.createdAt >= cutoff).length,
      completed: leads.filter((l) => l.status === 'completed' && l.createdAt >= cutoff).length,
      lost: leads.filter((l) => l.status === 'lost' && l.createdAt >= cutoff).length,
    };

    // Source breakdown
    const sourceMap: Record<string, { leads: number; closed: number; revenue: number }> = {};
    for (const l of leads.filter((l) => l.createdAt >= cutoff)) {
      const src = l.source || 'Unknown';
      if (!sourceMap[src]) sourceMap[src] = { leads: 0, closed: 0, revenue: 0 };
      sourceMap[src].leads++;
      if (l.status === 'booked' || l.status === 'completed') {
        sourceMap[src].closed++;
        sourceMap[src].revenue += l.value;
      }
    }
    const sources = Object.entries(sourceMap)
      .map(([source, data]) => ({
        source,
        ...data,
        conversionRate: data.leads > 0 ? Math.round((data.closed / data.leads) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Type breakdown
    const typeMap: Record<string, { count: number; revenue: number }> = {};
    for (const j of jobs.filter((j) => j.scheduledFor >= cutoff && j.status === 'completed')) {
      const t = j.type;
      if (!typeMap[t]) typeMap[t] = { count: 0, revenue: 0 };
      typeMap[t].count++;
      typeMap[t].revenue += j.value;
    }
    const typeBreakdown = Object.entries(typeMap).map(([type, data]) => ({ type, ...data }));

    // Top customers
    const topCustomers = [...customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Pipeline projection (open leads weighted by score)
    const openLeads = leads.filter((l) => l.status === 'new' || l.status === 'quoted');
    const projectedRevenue = openLeads.reduce((sum, l) => {
      const prob = l.aiScore !== undefined ? l.aiScore / 100 : (l.status === 'quoted' ? 0.4 : 0.15);
      return sum + l.value * prob;
    }, 0);

    // Cash flow from invoices
    const invoicesByStatus = {
      outstanding: invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0),
      collected: invoices.filter((i) => i.status === 'paid' && i.paidAt && i.paidAt >= cutoff).reduce((s, i) => s + i.amount, 0),
      overdue: invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0),
    };

    // Lead aging
    const aging = openLeads.map((l) => {
      const days = Math.floor((now - l.updatedAt) / dayMs);
      return { ...l, days };
    }).sort((a, b) => b.days - a.days).slice(0, 10);

    // Total revenue
    const totalRevenue = jobs
      .filter((j) => j.status === 'completed' && j.scheduledFor >= cutoff)
      .reduce((s, j) => s + j.value, 0);

    return NextResponse.json({
      range,
      revenueByDay,
      totalRevenue,
      funnel,
      sources,
      typeBreakdown,
      topCustomers,
      projectedRevenue: Math.round(projectedRevenue),
      openLeadsCount: openLeads.length,
      invoicesByStatus,
      staleLeads: aging,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
