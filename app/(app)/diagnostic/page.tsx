'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Status = 'pending' | 'running' | 'pass' | 'fail';
interface Check { name: string; status: Status; detail?: string; }

export default function DiagnosticPage() {
  const { openSidebar } = useShell();
  const [checks, setChecks] = useState<Check[]>([
    { name: 'Session active', status: 'pending' },
    { name: 'Stats endpoint', status: 'pending' },
    { name: 'Leads list', status: 'pending' },
    { name: 'Customers list', status: 'pending' },
    { name: 'Jobs list', status: 'pending' },
    { name: 'Reviews list', status: 'pending' },
    { name: 'Activity feed', status: 'pending' },
    { name: 'Search endpoint', status: 'pending' },
    { name: 'AI Quote (with persistence)', status: 'pending' },
    { name: 'Lead status auto-update', status: 'pending' },
    { name: 'Activity logged', status: 'pending' },
    { name: 'Invoice creation', status: 'pending' },
    { name: 'Public invoice access', status: 'pending' },
  ]);

  useEffect(() => { run(); }, []);

  function update(idx: number, patch: Partial<Check>) {
    setChecks((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function run() {
    let leadId: string | undefined;
    let invoicePublicToken: string | undefined;

    try {
      // 1. Session
      update(0, { status: 'running' });
      const stats = await fetch('/api/stats').then((r) => r.json());
      if (stats.error) { update(0, { status: 'fail', detail: 'Not authenticated' }); return; }
      update(0, { status: 'pass' });

      // 2. Stats
      update(1, { status: 'running' });
      update(1, { status: 'pass', detail: `Revenue MTD: $${stats.stats?.revenueMTD ?? 0} · ${stats.stats?.customerCount ?? 0} customers` });

      // 3. Leads
      update(2, { status: 'running' });
      const leadsRes = await fetch('/api/leads').then((r) => r.json());
      if (leadsRes.error) { update(2, { status: 'fail', detail: leadsRes.error }); return; }
      update(2, { status: 'pass', detail: `${leadsRes.leads.length} leads` });

      // 4. Customers
      update(3, { status: 'running' });
      const custRes = await fetch('/api/customers').then((r) => r.json());
      if (custRes.error) update(3, { status: 'fail', detail: custRes.error });
      else update(3, { status: 'pass', detail: `${custRes.customers.length} customers` });

      // 5. Jobs
      update(4, { status: 'running' });
      const jobsRes = await fetch('/api/jobs').then((r) => r.json());
      if (jobsRes.error) update(4, { status: 'fail', detail: jobsRes.error });
      else update(4, { status: 'pass', detail: `${jobsRes.jobs.length} jobs` });

      // 6. Reviews
      update(5, { status: 'running' });
      const revRes = await fetch('/api/reviews').then((r) => r.json());
      if (revRes.error) update(5, { status: 'fail', detail: revRes.error });
      else update(5, { status: 'pass', detail: `${revRes.reviews.length} reviews` });

      // 7. Activity
      update(6, { status: 'running' });
      const actRes = await fetch('/api/activity').then((r) => r.json());
      if (actRes.error) update(6, { status: 'fail', detail: actRes.error });
      else update(6, { status: 'pass', detail: `${actRes.activity.length} events` });

      // 8. Search
      update(7, { status: 'running' });
      const searchRes = await fetch('/api/search?q=lawn').then((r) => r.json());
      if (searchRes.error) update(7, { status: 'fail', detail: searchRes.error });
      else update(7, { status: 'pass', detail: `${(searchRes.leads?.length || 0) + (searchRes.customers?.length || 0) + (searchRes.jobs?.length || 0)} matches for "lawn"` });

      // 9. AI Quote
      update(8, { status: 'running' });
      const newLead = leadsRes.leads.find((l: any) => l.status === 'new' && !l.quote);
      if (!newLead) {
        update(8, { status: 'fail', detail: 'No "new" lead without a quote (reset one to retry)' });
      } else {
        leadId = newLead.id;
        const qRes = await fetch('/api/ai/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription: 'Diagnostic test', leadId }),
        });
        const qData = await qRes.json();
        if (!qRes.ok || !qData.quote) {
          update(8, { status: 'fail', detail: qData.error || `HTTP ${qRes.status}` });
        } else {
          update(8, { status: 'pass', detail: `${qData.quote.length} chars` });

          // 10 + 11. Verify
          await new Promise(r => setTimeout(r, 500));
          const reload = await fetch('/api/leads').then((r) => r.json());
          const updated = reload.leads.find((l: any) => l.id === leadId);
          if (!updated) {
            update(9, { status: 'fail', detail: 'Lead disappeared' });
            update(10, { status: 'fail' });
          } else {
            if (updated.status === 'quoted' && updated.quote && updated.quoteGeneratedAt) {
              update(9, { status: 'pass', detail: `Status: ${updated.status} (was: new)` });
            } else {
              update(9, { status: 'fail', detail: `Status: ${updated.status}, quote: ${!!updated.quote}` });
            }

            // 11. Activity logged for the quote
            const leadAct = await fetch(`/api/leads/${leadId}/activity`).then((r) => r.json());
            const hasStatusChange = leadAct.activity?.some((a: any) => a.type === 'lead-status-changed');
            if (hasStatusChange) {
              update(10, { status: 'pass', detail: `${leadAct.activity.length} events on lead` });
            } else {
              update(10, { status: 'fail', detail: 'No status-change activity' });
            }
          }
        }
      }

      // 12. Invoice creation
      update(11, { status: 'running' });
      const invRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: 'Diagnostic Test', amount: 100, status: 'draft', lineItems: [{ description: 'Test', amount: 100 }] }),
      });
      const invData = await invRes.json();
      if (!invRes.ok || !invData.invoice) {
        update(11, { status: 'fail', detail: invData.error });
      } else {
        invoicePublicToken = invData.invoice.publicToken;
        update(11, { status: 'pass', detail: `INV-${invData.invoice.id.slice(-6).toUpperCase()}` });
      }

      // 13. Public invoice
      if (invoicePublicToken) {
        update(12, { status: 'running' });
        const pubRes = await fetch(`/invoice/${invoicePublicToken}`);
        if (pubRes.ok) {
          update(12, { status: 'pass', detail: `Public link works: /invoice/${invoicePublicToken.slice(0, 8)}...` });
        } else {
          update(12, { status: 'fail', detail: `HTTP ${pubRes.status}` });
        }
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  const allPass = checks.every((c) => c.status === 'pass');
  const anyFail = checks.some((c) => c.status === 'fail');
  const anyRunning = checks.some((c) => c.status === 'running');

  return (
    <div>
      <TopBar
        title="Diagnostic"
        subtitle={anyRunning ? 'RUNNING CHECKS...' : allPass ? 'ALL SYSTEMS GREEN' : anyFail ? 'ISSUES DETECTED' : 'IDLE'}
        onMenuClick={openSidebar}
        action={
          <button
            onClick={() => { setChecks((c) => c.map((x) => ({ ...x, status: 'pending' as Status, detail: undefined }))); setTimeout(run, 200); }}
            className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
            Re-run
          </button>
        }
      />

      <div className="p-4 md:p-6 max-w-2xl">
        <div className="mb-6">
          <h2 className="font-serif italic text-3xl text-paper">
            {anyRunning ? 'Running checks...' : allPass ? 'All systems green.' : anyFail ? 'Issues detected.' : 'Ready.'}
          </h2>
        </div>

        <div className="space-y-2">
          {checks.map((c, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-md border ${
                c.status === 'pass' ? 'bg-acid/5 border-acid/30' :
                c.status === 'fail' ? 'bg-red-500/5 border-red-500/30' :
                c.status === 'running' ? 'bg-signal/5 border-signal/30' :
                'bg-ink-2 border-rule'
              }`}>
              <span className={`font-mono text-sm w-5 shrink-0 mt-0.5 ${
                c.status === 'pass' ? 'text-acid' : c.status === 'fail' ? 'text-red-400' :
                c.status === 'running' ? 'text-signal animate-pulse' : 'text-paper-dim'
              }`}>
                {c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : c.status === 'running' ? '⟳' : '○'}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${c.status === 'fail' ? 'text-red-400' : 'text-paper'}`}>{c.name}</div>
                {c.detail && <div className="font-mono text-[11px] text-paper-mute mt-1 break-all">{c.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
