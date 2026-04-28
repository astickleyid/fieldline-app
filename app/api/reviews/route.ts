import { NextRequest, NextResponse } from 'next/server';
import { listReviews, createReview } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const reviews = await listReviews(userId);
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const b = await req.json();
    const review = await createReview({
      userId,
      customer: b.customer,
      rating: Number(b.rating),
      text: b.text,
      source: b.source || 'fieldline',
    });
    return NextResponse.json({ review });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
