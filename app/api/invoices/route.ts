import { NextRequest, NextResponse } from 'next/server';
import { listInvoices, createInvoice } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const invoices = await listInvoices(userId);
    return NextResponse.json({ invoices });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const invoice = await createInvoice({
      userId,
      jobId: body.jobId,
      leadId: body.leadId,
      customerId: body.customerId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      amount: Number(body.amount),
      status: body.status || 'draft',
      lineItems: body.lineItems || [{ description: body.description || 'Services', amount: Number(body.amount) }],
      dueDate: body.dueDate ? Number(body.dueDate) : undefined,
    });
    return NextResponse.json({ invoice });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
