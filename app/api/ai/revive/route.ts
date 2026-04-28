import { NextRequest, NextResponse } from 'next/server';
import { getLead, getUserById, logAI } from '@/lib/db';
import { reviveLead } from '@/lib/ai';
import { requireUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const { leadId } = await req.json();
    const lead = await getLead(leadId);
    const user = await getUserById(userId);
    if (!lead || !user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const daysIdle = Math.max(1, Math.floor((Date.now() - lead.updatedAt) / 86_400_000));
    const message = await reviveLead({
      leadName: lead.name,
      daysIdle,
      status: lead.status,
      jobDescription: `${lead.type} — ${lead.notes || lead.address || ''}`,
      businessName: user.businessName,
      voice: user.voice,
    });

    await logAI(userId, { type: 'follow-up', summary: `Re-engaged stale lead: ${lead.name}` });
    return NextResponse.json({ message });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
