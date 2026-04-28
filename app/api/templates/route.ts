import { NextRequest, NextResponse } from 'next/server';
import { listEmailTemplates, createEmailTemplate } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const templates = await listEmailTemplates(userId);
    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const template = await createEmailTemplate({
      userId,
      name: body.name,
      subject: body.subject,
      body: body.body,
      category: body.category || 'general',
    });
    return NextResponse.json({ template });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
