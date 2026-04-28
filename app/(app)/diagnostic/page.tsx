'use client';

import { useEffect, useState } from 'react';

type Status = 'pending' | 'running' | 'pass' | 'fail';

interface Check {
  name: string;
  status: Status;
  detail?: string;
}

export default function DiagnosticPage() {
  const [checks, setChecks] = useState<Check[]>([
    { name: 'Session active', status: 'pending' },
    { name: 'Stats endpoint', status: 'pending' },
    { name: 'Leads endpoint', status: 'pending' },
    { name: 'Pick a "new" lead', status: 'pending' },
    { name: 'Generate AI quote (saves leadId)', status: 'pending' },
    { name: 'Verify quote saved on lead', status: 'pending' },
    { name: 'Verify status moved to "quoted"', status: 'pending' },
    { name: 'Reviews endpoint', status: 'pending' },
  ]);

  useEffect(() => { run(); }, []);

  function update(idx: number, patch: Partial<Check>) {
    setChecks((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function run() {
    let leadId: string | undefined;

    // 1. Session
    update(0, { status: 'running' });
    const stats = await fetch('/api/stats').then((r) => r.json());
    if (stats.error) {
      update(0, { status: 'fail', detail: 'Not logged in. Sign in first then revisit /diagnostic.' });
      return;
    }
    update(0, { status: 'pass' });

    // 2. Stats
    update(1, { status: 'running' });
    update(1, { status: 'pass', detail: `Revenue MTD: $${stats.stats?.revenueMTD ?? 0}` });

    // 3. Leads
    update(2, { status: 'running' });
    const leadsRes = await fetch('/api/leads').then((r) => r.json());
    if (leadsRes.error) {
      update(2, { status: 'fail', detail: leadsRes.error });
      return;
    }
    update(2, { status: 'pass', detail: `${leadsRes.leads.length} leads loaded` });

    // 4. Pick a new lead
    update(3, { status: 'running' });
    const newLead = leadsRes.leads.find((l: any) => l.status === 'new' && !l.quote);
    if (!newLead) {
      update(3, { status: 'fail', detail: 'No "new" leads without a quote — create one first or reset a quote.' });
      return;
    }
    leadId = newLead.id;
    update(3, { status: 'pass', detail: `Using: ${newLead.name} (${leadId})` });

    // 5. Generate quote with leadId
    update(4, { status: 'running' });
    const qRes = await fetch('/api/ai/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobDescription: 'Diagnostic test — weekly lawn maintenance',
        leadId,
      }),
    });
    const qData = await qRes.json();
    if (!qRes.ok || !qData.quote) {
      update(4, { status: 'fail', detail: qData.error || `HTTP ${qRes.status}` });
      return;
    }
    update(4, { status: 'pass', detail: `Quote generated (${qData.quote.length} chars)` });

    // 6 + 7. Re-fetch and verify
    update(5, { status: 'running' });
    update(6, { status: 'running' });
    const reload = await fetch('/api/leads').then((r) => r.json());
    const updated = reload.leads.find((l: any) => l.id === leadId);
    if (!updated) {
      update(5, { status: 'fail', detail: 'Lead disappeared.' });
      update(6, { status: 'fail' });
      return;
    }
    if (!updated.quote) {
      update(5, { status: 'fail', detail: 'quote field is empty after API call.' });
    } else {
      update(5, { status: 'pass', detail: `Saved at ${new Date(updated.quoteGeneratedAt).toLocaleTimeString()}` });
    }
    if (updated.status !== 'quoted') {
      update(6, { status: 'fail', detail: `Status is "${updated.status}", expected "quoted".` });
    } else {
      update(6, { status: 'pass', detail: 'Status correctly moved to quoted' });
    }

    // 8. Reviews
    update(7, { status: 'running' });
    const rRes = await fetch('/api/reviews').then((r) => r.json());
    if (rRes.error) {
      update(7, { status: 'fail', detail: rRes.error });
    } else {
      update(7, { status: 'pass', detail: `${rRes.reviews.length} reviews loaded` });
    }
  }

  const allPass = checks.every((c) => c.status === 'pass');
  const anyFail = checks.some((c) => c.status === 'fail');

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-2">
          System Diagnostic · Build {new Date().toISOString().slice(0, 16)}
        </div>
        <h1 className="font-serif italic text-4xl text-paper">
          {allPass ? 'All systems green.' : anyFail ? 'Issues detected.' : 'Running checks...'}
        </h1>
      </div>

      <div className="space-y-2">
        {checks.map((c, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-md border ${
              c.status === 'pass'
                ? 'bg-acid/5 border-acid/30'
                : c.status === 'fail'
                ? 'bg-red-500/5 border-red-500/30'
                : c.status === 'running'
                ? 'bg-signal/5 border-signal/30'
                : 'bg-ink-2 border-rule'
            }`}>
            <span
              className={`font-mono text-sm w-5 shrink-0 mt-0.5 ${
                c.status === 'pass' ? 'text-acid' : c.status === 'fail' ? 'text-red-400' : c.status === 'running' ? 'text-signal' : 'text-paper-dim'
              }`}>
              {c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : c.status === 'running' ? '⟳' : '○'}
            </span>
            <div className="flex-1">
              <div className={`text-sm ${c.status === 'fail' ? 'text-red-400' : 'text-paper'}`}>{c.name}</div>
              {c.detail && <div className="font-mono text-[11px] text-paper-mute mt-1 break-all">{c.detail}</div>}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => { setChecks((c) => c.map((x) => ({ ...x, status: 'pending', detail: undefined }))); setTimeout(run, 100); }}
        className="mt-8 px-4 py-2 bg-signal hover:bg-signal/80 text-white rounded-md text-sm font-medium">
        Re-run diagnostic →
      </button>
    </div>
  );
}
