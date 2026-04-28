import { NextRequest, NextResponse } from 'next/server';
import { listLeads, listCustomers, listJobs, listInvoices } from '@/lib/db';
import { requireUser } from '@/lib/session';

function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows: any[], headers: string[]): string {
  const head = headers.join(',');
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')).join('\n');
  return head + '\n' + body;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const type = req.nextUrl.searchParams.get('type') || 'leads';

    let csv = '';
    let filename = `fieldline-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'leads') {
      const leads = await listLeads(userId);
      csv = toCSV(
        leads.map((l) => ({
          ...l,
          createdAt: new Date(l.createdAt).toISOString(),
          updatedAt: new Date(l.updatedAt).toISOString(),
          quoteGeneratedAt: l.quoteGeneratedAt ? new Date(l.quoteGeneratedAt).toISOString() : '',
          tags: (l.tags || []).join(';'),
        })),
        ['id', 'name', 'phone', 'email', 'address', 'status', 'type', 'value', 'source', 'tags', 'notes', 'aiScore', 'createdAt', 'updatedAt']
      );
    } else if (type === 'customers') {
      const customers = await listCustomers(userId);
      csv = toCSV(
        customers.map((c) => ({
          ...c,
          createdAt: new Date(c.createdAt).toISOString(),
          firstSeenAt: new Date(c.firstSeenAt).toISOString(),
          lastJobAt: c.lastJobAt ? new Date(c.lastJobAt).toISOString() : '',
          tags: (c.tags || []).join(';'),
        })),
        ['id', 'name', 'phone', 'email', 'address', 'tags', 'totalSpent', 'jobCount', 'firstSeenAt', 'lastJobAt']
      );
    } else if (type === 'jobs') {
      const jobs = await listJobs(userId);
      csv = toCSV(
        jobs.map((j) => ({
          ...j,
          scheduledFor: new Date(j.scheduledFor).toISOString(),
          createdAt: new Date(j.createdAt).toISOString(),
        })),
        ['id', 'customerName', 'scheduledFor', 'durationMinutes', 'status', 'type', 'address', 'value', 'recurring', 'notes', 'createdAt']
      );
    } else if (type === 'invoices') {
      const invoices = await listInvoices(userId);
      csv = toCSV(
        invoices.map((i) => ({
          ...i,
          createdAt: new Date(i.createdAt).toISOString(),
          sentAt: i.sentAt ? new Date(i.sentAt).toISOString() : '',
          paidAt: i.paidAt ? new Date(i.paidAt).toISOString() : '',
          dueDate: i.dueDate ? new Date(i.dueDate).toISOString() : '',
          publicUrl: `${req.nextUrl.origin}/invoice/${i.publicToken}`,
        })),
        ['id', 'customerName', 'customerEmail', 'amount', 'status', 'dueDate', 'sentAt', 'paidAt', 'createdAt', 'publicUrl']
      );
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
