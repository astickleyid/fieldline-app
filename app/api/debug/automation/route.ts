import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { listLeads, listAutomationRules } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const leads = await listLeads(userId);
    const rules = await listAutomationRules(userId);
    const staleRules = rules.filter((r) => r.enabled && r.trigger === 'lead-stale');

    const debug: any = {
      userId,
      now: Date.now(),
      leadCount: leads.length,
      ruleCount: rules.length,
      staleRuleCount: staleRules.length,
      staleRules: staleRules.map((r) => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled,
        conditions: r.conditions,
        action: r.action,
      })),
      leads: leads.slice(0, 5).map((l) => ({
        id: l.id,
        name: l.name,
        status: l.status,
        updatedAt: l.updatedAt,
        ageMs: Date.now() - l.updatedAt,
      })),
      matchingForFirstRule: staleRules[0] ? leads.filter((l) => {
        const minDays = Number(staleRules[0].conditions.daysIdle ?? 3);
        const isOpen = l.status === 'new' || l.status === 'quoted';
        const isStale = Date.now() - l.updatedAt > minDays * 86_400_000;
        return isOpen && isStale;
      }).map((l) => ({ id: l.id, name: l.name, status: l.status })) : [],
    };

    return NextResponse.json(debug);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
