import { NextRequest, NextResponse } from 'next/server';
import { writeFollowUp } from '@/lib/ai';
import { getUserById, logAI } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { friendlyAIError } from '@/lib/ai-errors';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { leadName, daysSinceQuote, jobDescription } = await req.json();

    let message: string;
    try {
      message = await writeFollowUp({
        leadName,
        daysSinceQuote: Number(daysSinceQuote) || 3,
        jobDescription: jobDescription || '',
        businessName: user.businessName,
        voice: user.voice,
      });
    } catch (aiErr: any) {
      const { message: friendly, status } = friendlyAIError(aiErr);
      return NextResponse.json({ error: friendly }, { status });
    }

    await logAI(userId, {
      type: 'follow-up',
      summary: `Day-${daysSinceQuote} follow-up drafted for ${leadName}`,
    });

    return NextResponse.json({ message });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
