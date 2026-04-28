import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, updateCustomer, deleteCustomer, listCustomerActivity } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const customer = await getCustomer(ctx.params.id);
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const activity = await listCustomerActivity(ctx.params.id);
    return NextResponse.json({ customer, activity });
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
