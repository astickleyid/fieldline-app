'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Analytics = {
  range: string;
  revenueByDay: { date: string; revenue: number }[];
  totalRevenue: number;
  funnel: { new: number; quoted: number; booked: number; completed: number; lost: number };
  sources: { source: string; leads: number; closed: number; revenue: number; conversionRate: number }[];
  typeBreakdown: { type: string; count: number; revenue: number }[];
  topCustomers: any[];
  projectedRevenue: number;
  openLeadsCount: number;
  invoicesByStatus: { outstanding: number; collected: number; overdue: number };
  staleLeads: any[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '365d'>('30d');
  const [loading, setLoading] = useState(true);
  const { openSidebar } = useShell();

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [range]);

  async function load() {
    setLoading(true);
    const d = await fetch(`/api/analytics?range=${range}`).then((r) => r.json());
    setData(d);
    setLoading(false);
  }

  return (
    <div>
      <TopBar
        title="Analytics"
        subtitle={data ? `$${data.totalRevenue.toLocaleString()} REVENUE · $${data.projectedRevenue.toLocaleString()} PROJECTED · ${data.openLeadsCount} OPEN LEADS` : '—'}
        onMenuClick={openSidebar}
        action={
          <div className="flex gap-1">
            {(['7d', '30d', '90d', '365d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded font-mono text-[10px] tracking-wider uppercase ${
                  range === r ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
                }`}>
                {r}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="p-8 text-center text-paper-mute font-mono text-xs">Loading analytics...</div>
      ) : !data ? (
        <div className="p-8 text-center text-paper-mute">Failed to load.</div>
      ) : (
        <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Revenue" value={`$${data.totalRevenue.toLocaleString()}`} sub={`last ${range}`}/>
            <KPI label="Projected" value={`$${data.projectedRevenue.toLocaleString()}`} sub={`from ${data.openLeadsCount} open leads`} accent="signal"/>
            <KPI label="Outstanding" value={`$${data.invoicesByStatus.outstanding.toLocaleString()}`} sub="invoices unpaid"/>
            <KPI label="Collected" value={`$${data.invoicesByStatus.collected.toLocaleString()}`} sub={`paid in ${range}`} accent="acid"/>
          </div>

          {/* Revenue chart */}
          <div className="bg-ink-2 border border-rule rounded-lg p-4">
            <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase mb-3">Revenue by Day</div>
            <RevenueChart data={data.revenueByDay}/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Funnel */}
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase mb-3">Conversion Funnel</div>
              <Funnel funnel={data.funnel}/>
            </div>

            {/* Sources */}
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase mb-3">Lead Sources</div>
              {data.sources.length === 0 ? (
                <div className="text-center py-8 text-paper-dim text-sm italic">No source data yet</div>
              ) : (
                <div className="space-y-2">
                  {data.sources.map((s) => {
                    const max = Math.max(...data.sources.map((x) => x.revenue), 1);
                    return (
                      <div key={s.source}>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-paper">{s.source}</span>
                          <span className="font-mono text-paper-mute">${s.revenue.toLocaleString()} · {s.conversionRate}%</span>
                        </div>
                        <div className="h-2 bg-ink rounded-full overflow-hidden">
                          <div className="h-full bg-signal rounded-full" style={{ width: `${(s.revenue / max) * 100}%` }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Customers */}
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase mb-3">Top Customers (lifetime)</div>
              {data.topCustomers.length === 0 ? (
                <div className="text-center py-8 text-paper-dim text-sm italic">No customers yet</div>
              ) : (
                <div className="divide-y divide-rule">
                  {data.topCustomers.slice(0, 5).map((c) => (
                    <Link key={c.id} href={`/customers/${c.id}`} className="flex justify-between items-center py-2 hover:bg-ink/40 -mx-2 px-2 rounded">
                      <div className="min-w-0">
                        <div className="text-sm text-paper truncate">{c.name}</div>
                        <div className="font-mono text-[10px] text-paper-dim">{c.jobCount} jobs</div>
                      </div>
                      <div className="font-serif italic text-xl text-acid">${c.totalSpent.toLocaleString()}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Stale leads */}
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase mb-3">⚠ Stale Leads (need follow-up)</div>
              {data.staleLeads.length === 0 ? (
                <div className="text-center py-8 text-paper-dim text-sm italic">No stale leads — nice work</div>
              ) : (
                <div className="divide-y divide-rule">
                  {data.staleLeads.slice(0, 5).map((l) => (
                    <Link key={l.id} href={`/leads/${l.id}`} className="flex justify-between items-center py-2 hover:bg-ink/40 -mx-2 px-2 rounded">
                      <div className="min-w-0">
                        <div className="text-sm text-paper truncate">{l.name}</div>
                        <div className="font-mono text-[10px] text-paper-dim">{l.status} · ${l.value}</div>
                      </div>
                      <div className={`font-mono text-xs ${l.days > 7 ? 'text-red-400' : l.days > 3 ? 'text-amber-400' : 'text-paper-mute'}`}>
                        {l.days}d idle
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Type breakdown */}
          {data.typeBreakdown.length > 0 && (
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase mb-3">Revenue by Type</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.typeBreakdown.map((t) => (
                  <div key={t.type} className="bg-ink border border-rule rounded p-3">
                    <div className="font-mono text-[10px] text-paper-mute uppercase tracking-wider mb-1">{t.type}</div>
                    <div className="font-serif italic text-2xl text-paper">${t.revenue.toLocaleString()}</div>
                    <div className="font-mono text-[10px] text-paper-dim mt-1">{t.count} jobs</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          <div className="bg-ink-2 border border-rule rounded-lg p-4">
            <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase mb-3">Export Data</div>
            <div className="flex flex-wrap gap-2">
              {(['leads', 'customers', 'jobs', 'invoices'] as const).map((t) => (
                <a key={t} href={`/api/export?type=${t}`} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
                  ↓ Export {t}.csv
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: 'signal' | 'acid' }) {
  return (
    <div className="bg-ink-2 border border-rule rounded-lg p-4">
      <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-1">{label}</div>
      <div className={`font-serif italic text-3xl tracking-tight leading-none ${
        accent === 'signal' ? 'text-signal' : accent === 'acid' ? 'text-acid' : 'text-paper'
      }`}>{value}</div>
      <div className="font-mono text-[10px] text-paper-dim mt-2">{sub}</div>
    </div>
  );
}

function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const height = 140;

  return (
    <div>
      <div className="flex items-end gap-0.5 h-[140px]">
        {data.map((d, i) => {
          const h = (d.revenue / max) * height;
          const isToday = i === data.length - 1;
          return (
            <div key={d.date} className="flex-1 group relative" title={`${d.date}: $${d.revenue.toLocaleString()}`}>
              <div
                className={`rounded-sm transition-all ${
                  isToday ? 'bg-signal' : d.revenue > 0 ? 'bg-paper-mute hover:bg-paper' : 'bg-rule'
                }`}
                style={{ height: `${Math.max(h, 2)}px` }}
              />
              {d.revenue > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 bg-ink-3 border border-rule rounded px-2 py-1 font-mono text-[10px] text-paper whitespace-nowrap pointer-events-none transition-opacity z-10">
                  ${d.revenue.toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 font-mono text-[10px] text-paper-dim">
        <span>{data[0]?.date.slice(5)}</span>
        <span>${total.toLocaleString()} total</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function Funnel({ funnel }: { funnel: { new: number; quoted: number; booked: number; completed: number; lost: number } }) {
  const stages = [
    { label: 'New leads', count: funnel.new, color: 'bg-signal/30' },
    { label: 'Quoted', count: funnel.quoted, color: 'bg-signal/50' },
    { label: 'Booked', count: funnel.booked, color: 'bg-acid/40' },
    { label: 'Completed', count: funnel.completed, color: 'bg-acid' },
  ];
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <div key={s.label}>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-paper">{s.label}</span>
            <span className="font-mono text-paper-mute">{s.count}</span>
          </div>
          <div className="h-6 bg-ink rounded-md overflow-hidden border border-rule">
            <div
              className={`h-full ${s.color} transition-all duration-500`}
              style={{ width: `${(s.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <div className="pt-2 mt-2 border-t border-rule flex justify-between text-xs">
        <span className="text-paper-mute">Lost</span>
        <span className="font-mono text-red-400">{funnel.lost}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-paper-mute">Win rate</span>
        <span className="font-mono text-acid">
          {funnel.new > 0 ? Math.round((funnel.completed / funnel.new) * 100) : 0}%
        </span>
      </div>
    </div>
  );
}
