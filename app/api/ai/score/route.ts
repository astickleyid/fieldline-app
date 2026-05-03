import { NextResponse } from 'next/server';
import { listLeads, updateLead, getUserById, logAI } from '@/lib/db';
import { scoreLeads } from '@/lib/ai';
import { requireUser } from '@/lib/session';
import { friendlyAIError } from '@/lib/ai-errors';

export async function POST() {
  try {
    const { userId } = await requireUser();
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const allLeads = await listLeads(userId);
    // Score open leads only (new + quoted)
    const openLeads = allLeads.filter((l) => l.status === 'new' || l.status === 'quoted');
    if (openLeads.length === 0) return NextResponse.json({ scored: 0, scores: [] });

    let scores: any;

    try {
      scores = await scoreLeads({
        leads: openLeads.map((l) => ({
        id: l.id, name: l.name, status: l.status, type: l.type, value: l.value,
        source: l.source, notes: l.notes, quote: l.quote, address: l.address,
        createdAt: l.createdAt, updatedAt: l.updatedAt,
      })),
      trade: user.trade,
      businessName: user.businessName,
    });
    } catch (aiErr: any) {
      const { message: friendly, status } = friendlyAIError(aiErr);

      return NextResponse.json({ error: friendly }, { status });
    }

    // Save scores back to leads
    for (const s of scores) {
      await updateLead(s.id, {
        aiScore: s.score,
        aiScoreReasoning: s.reasoning,
        aiScoredAt: Date.now(),
      });
    }

    await logAI(userId, {
      type: 'lead-scoring',
      summary: `Scored ${scores.length} open leads`,
    });

    return NextResponse.json({ scored: scores.length, scores });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
