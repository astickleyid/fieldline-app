import { NextRequest, NextResponse } from 'next/server';
import { listReviews, updateReviewReply, getUserById, logAI } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { replyToReview } from '@/lib/ai';
import { friendlyAIError } from '@/lib/ai-errors';

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const reviews = await listReviews(userId);
    const review = reviews.find((r) => r.id === ctx.params.id);
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    let reply: string;

    if (body.manual && typeof body.text === 'string') {
      reply = body.text;
    } else {
      try {
        reply = await replyToReview({
          reviewText: review.text,
          rating: review.rating,
          customer: review.customer,
          businessName: user.businessName,
          voice: user.voice,
        });
      } catch (aiErr: any) {
        const { message: friendly, status } = friendlyAIError(aiErr);
        return NextResponse.json({ error: friendly }, { status });
      }
    }

    const updated = await updateReviewReply(userId, ctx.params.id, reply);
    await logAI(userId, {
      type: 'review-reply',
      summary: `Replied to ${review.rating}★ from ${review.customer}`,
    });

    return NextResponse.json({ review: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
