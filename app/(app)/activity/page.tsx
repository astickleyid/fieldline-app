'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Activity = {
  id: string;
  type: string;
  message: string;
  leadId?: string;
  customerId?: string;
  jobId?: string;
  timestamp: number;
};

export default function ActivityPage() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { openSidebar } = useShell();

  useEffect(() => {
    fetch('/api/activity').then((r) => r.json()).then((d) => {
      setActivity(d.activity || []);
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all' ? activity : activity.filter((a) => a.type.startsWith(filter));

  // Group by day
  const groups: Record<string, Activity[]> = {};
  filtered.forEach((a) => {
    const date = new Date(a.timestamp);
    const key = date.toDateString();
    (groups[key] = groups[key] || []).push(a);
  });

  return (
    <div>
      <TopBar
        title="Activity"
        subtitle={`${activity.length} EVENTS · LAST ${activity[0] ? fmtDate(activity[0].timestamp) : '—'}`}
        onMenuClick={openSidebar}
      />

      <div className="border-b border-rule px-4 md:px-6 h-12 flex items-center gap-1 bg-ink/40 overflow-x-auto">
        {[
          { key: 'all', label: 'All' },
          { key: 'lead', label: 'Leads' },
          { key: 'job', label: 'Jobs' },
          { key: 'invoice', label: 'Invoices' },
          { key: 'review', label: 'Reviews' },
          { key: 'note', label: 'Notes' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all whitespace-nowrap ${
              filter === f.key ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper hover:bg-rule'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6 max-w-3xl">
        {loading ? (
          <div className="text-center py-12 text-paper-mute font-mono text-xs">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-paper-mute">No activity yet</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([day, events]) => (
              <div key={day}>
                <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">
                  {day === new Date().toDateString() ? 'Today' : new Date(day).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
                  {events.map((a) => (
                    <div key={a.id} className="px-4 py-3 border-b border-rule last:border-0 hover:bg-ink/40 flex items-start gap-3">
                      <ActivityIcon type={a.type}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-paper">{a.message}</div>
                        <div className="flex gap-3 items-center mt-1">
                          <span className="font-mono text-[10px] text-paper-dim">{new Date(a.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                          {a.leadId && <Link href={`/leads/${a.leadId}`} className="font-mono text-[10px] text-signal hover:text-signal-bright">→ Lead</Link>}
                          {a.customerId && <Link href={`/customers/${a.customerId}`} className="font-mono text-[10px] text-signal hover:text-signal-bright">→ Customer</Link>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtDate(t: number) {
  const d = Date.now() - t;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return Math.floor(d / 60_000) + 'm ago';
  if (d < 86_400_000) return Math.floor(d / 3_600_000) + 'h ago';
  return Math.floor(d / 86_400_000) + 'd ago';
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { color: string; symbol: string }> = {
    'lead-created': { color: 'text-paper-mute', symbol: '✦' },
    'lead-status-changed': { color: 'text-signal', symbol: '↻' },
    'note-added': { color: 'text-paper', symbol: '✎' },
    'quote-generated': { color: 'text-signal', symbol: '⚡' },
    'job-scheduled': { color: 'text-acid', symbol: '▦' },
    'job-completed': { color: 'text-acid', symbol: '✓' },
    'invoice-sent': { color: 'text-blue-400', symbol: '$' },
    'invoice-paid': { color: 'text-acid', symbol: '$' },
    'review-received': { color: 'text-yellow-400', symbol: '★' },
    'review-replied': { color: 'text-yellow-400', symbol: '↩' },
  };
  const meta = map[type] || { color: 'text-paper-mute', symbol: '·' };
  return <span className={`${meta.color} font-mono text-sm w-5 text-center shrink-0 mt-0.5`}>{meta.symbol}</span>;
}
