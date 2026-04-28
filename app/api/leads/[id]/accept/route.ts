import { NextRequest, NextResponse } from 'next/server';
import { getLead, setLeadQuoteToken, updateLead, getLeadByQuoteToken, logActivity } from '@/lib/db';
import { newId } from '@/lib/db';
import { requireUser } from '@/lib/session';

// Owner generates / refreshes a public accept link for a lead
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const lead = await getLead(ctx.params.id);
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let token = lead.quoteAcceptToken;
    if (!token) {
      token = newId('qt').replace('qt_', '');
      await setLeadQuoteToken(lead.id, token);
    }

    return NextResponse.json({ token, url: `/quote/${token}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Customer accepts the quote (no auth - via token)
export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const lead = await getLead(ctx.params.id);
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await updateLead(lead.id, {
      status: 'booked',
      quoteAcceptedAt: Date.now(),
    });
    await logActivity(lead.userId, 'lead-status-changed', `Customer accepted quote: ${lead.name}`, {
      leadId: lead.id,
      metadata: { from: lead.status, to: 'booked', via: 'public-accept' },
    });

    return NextResponse.json({ lead: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
