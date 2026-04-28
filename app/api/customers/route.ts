import { NextRequest, NextResponse } from 'next/server';
import { listCustomers, createCustomer } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const customers = await listCustomers(userId);
    return NextResponse.json({ customers });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const customer = await createCustomer({
      userId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      tags: body.tags || [],
      notes: body.notes,
    });
    return NextResponse.json({ customer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
