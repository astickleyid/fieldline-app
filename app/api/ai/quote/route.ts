import { NextRequest, NextResponse } from 'next/server';
import { generateQuote } from '@/lib/ai';
import { getUserById, logAI, updateLead } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { jobDescription, leadId } = await req.json();
    if (!jobDescription) return NextResponse.json({ error: 'jobDescription required' }, { status: 400 });

    const quote = await generateQuote({
      jobDescription,
      trade: user.trade,
      businessName: user.businessName,
      voice: user.voice,
    });

    // Persist to lead if leadId provided
    if (leadId) {
      await updateLead(leadId, {
        quote,
        quoteGeneratedAt: Date.now(),
        status: 'quoted',
      });
    }

    await logAI(userId, {
      type: 'quote',
      summary: `Quote drafted: ${jobDescription.slice(0, 60)}`,
    });

    return NextResponse.json({ quote });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
