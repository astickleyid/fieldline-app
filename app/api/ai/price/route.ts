import { NextRequest, NextResponse } from 'next/server';
import { listJobs, getUserById, logAI } from '@/lib/db';
import { suggestPrice } from '@/lib/ai';
import { requireUser } from '@/lib/session';
import { friendlyAIError } from '@/lib/ai-errors';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { jobDescription, jobType } = await req.json();
    if (!jobDescription) return NextResponse.json({ error: 'jobDescription required' }, { status: 400 });

    // Find similar completed jobs of same type
    const allJobs = await listJobs(userId);
    const similar = allJobs
      .filter((j) => j.status === 'completed' && (!jobType || j.type === jobType))
      .slice(0, 15)
      .map((j) => ({ description: j.notes || j.customerName, value: j.value }));

    let suggestion: any;

    try {
      suggestion = await suggestPrice({
      jobDescription,
      trade: user.trade,
      similarJobs: similar,
      businessName: user.businessName,
    });
    } catch (aiErr: any) {
      const { message: friendly, status } = friendlyAIError(aiErr);

      return NextResponse.json({ error: friendly }, { status });
    }

    await logAI(userId, { type: 'pricing', summary: `Pricing: ${jobDescription.slice(0, 50)} → $${suggestion.suggested}` });

    return NextResponse.json(suggestion);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
