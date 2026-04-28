import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, updateCustomer, deleteCustomer, listCustomerActivity, listJobs, listInvoices } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const customer = await getCustomer(ctx.params.id);
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const [activity, allJobs, allInvoices] = await Promise.all([
      listCustomerActivity(ctx.params.id),
      listJobs(userId),
      listInvoices(userId),
    ]);
    const jobs = allJobs.filter((j) =>
      j.customerId === ctx.params.id ||
      j.customerName?.toLowerCase() === customer.name.toLowerCase()
    );
    const invoices = allInvoices.filter((i) =>
      i.customerId === ctx.params.id ||
      i.customerName?.toLowerCase() === customer.name.toLowerCase()
    );
    return NextResponse.json({ customer, activity, jobs, invoices });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const patch = await req.json();
    const updated = await updateCustomer(ctx.params.id, patch);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ customer: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await deleteCustomer(ctx.params.id, userId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
