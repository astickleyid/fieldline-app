import { NextRequest, NextResponse } from 'next/server';
import { getUserById, createLead, logActivity } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET — look up business info for booking form
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('id');
  if (!businessId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const user = await getUserById(businessId);
  if (!user) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  return NextResponse.json({
    business: {
      id: user.id,
      name: user.businessName,
      trade: user.trade,
      phone: user.phone,
    },
  });
}

// POST — submit booking inquiry (creates lead, no auth required)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, name, phone, email, address, type, value, notes } = body;

    if (!businessId || !name) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const user = await getUserById(businessId);
    if (!user) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const lead = await createLead({
      userId: businessId,
      name,
      phone,
      email,
      address,
      status: 'new',
      type: type || user.trade,
      value: Number(value) || 0,
      source: 'Online Booking',
      notes,
    });

    await logActivity(businessId, 'lead-created', `New lead via online booking: ${name}`, { leadId: lead.id });

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
