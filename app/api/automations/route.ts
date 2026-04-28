import { NextRequest, NextResponse } from 'next/server';
import { listAutomationRules, createAutomationRule } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const rules = await listAutomationRules(userId);
    return NextResponse.json({ rules });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const rule = await createAutomationRule({
      userId,
      name: body.name,
      trigger: body.trigger,
      conditions: body.conditions || {},
      action: body.action,
      actionConfig: body.actionConfig || {},
      enabled: body.enabled !== false,
    });
    return NextResponse.json({ rule });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
