'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = { revenueMTD: number; jobsBooked: number; pipelineValue: number; rating: number; reviewCount: number };
type AILogEntry = { id: string; type: string; summary: string; timestamp: number };
type Lead = { id: string; name: string; status: string; type: string; value: number; address?: string };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [aiLog, setAILog] = useState<AILogEntry[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [todayJobs, setTodayJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then((r) => r.json()),
      fetch('/api/leads').then((r) => r.json()),
      fetch('/api/jobs').then((r) => r.json()),
    ]).then(([s, l, j]) => {
      setStats(s.stats);
      setAILog(s.aiLog || []);
      setLeads(l.leads || []);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const todays = (j.jobs || []).filter((job: any) => {
        return job.scheduledFor >= today.getTime() && job.scheduledFor < tomorrow.getTime();
      }).sort((a: any, b: any) => a.scheduledFor - b.scheduledFor);
      setTodayJobs(todays);
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) => '$' + n.toLocaleString();
  const time = (t: number) => {
    const d = new Date(t);
    const diff = Date.now() - t;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago';
    if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h ago';
    return d.toLocaleDateString();
  };

  const grouped = {
    new: leads.filter((l) => l.status === 'new'),
    quoted: leads.filter((l) => l.status === 'quoted'),
    booked: leads.filter((l) => l.status === 'booked'),
  };

  return (
    <div>
      {/* Top bar */}
      <div className="border-b border-rule px-6 h-14 flex items-center justify-between sticky top-0 bg-ink/80 backdrop-blur-md z-30">
        <div>
          <h1 className="text-base font-medium">Dashboard</h1>
          <div className="font-mono text-[10px] text-paper-dim tracking-wider mt-0.5">
            {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads" className="px-3 py-1.5 text-xs border border-rule rounded-md text-paper-mute hover:text-paper hover:border-paper-dim transition-all">
            + New Lead
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Revenue MTD', value: stats ? fmt(stats.revenueMTD) : '—', delta: '+24.3%' },
            { label: 'Jobs Booked', value: stats?.jobsBooked ?? '—', delta: '+3 today' },
            { label: 'Open Pipeline', value: stats ? fmt(stats.pipelineValue) : '—', delta: `${grouped.new.length + grouped.quoted.length} leads` },
            { label: 'Google Rating', value: stats ? `${stats.rating.toFixed(1)}★` : '—', delta: `${stats?.reviewCount ?? 0} reviews` },
          ].map((s) => (
            <div key={s.label} className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-1">{s.label}</div>
              <div className="font-serif italic text-3xl tracking-tight leading-none">{s.value}</div>
              <div className="font-mono text-[11px] text-acid mt-2">{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Today's schedule */}
        {todayJobs.length > 0 && (
          <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-rule flex justify-between items-center">
              <div>
                <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase">Today's Schedule</div>
                <div className="text-[11px] text-paper-dim mt-0.5">{todayJobs.length} jobs · {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              </div>
              <Link href="/calendar" className="font-mono text-[10px] text-signal hover:text-signal-bright tracking-wider uppercase">
                Full schedule →
              </Link>
            </div>
            <div className="divide-y divide-rule">
              {todayJobs.map((job) => {
                const time = new Date(job.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const isPast = job.scheduledFor < Date.now() && job.scheduledFor + job.durationMinutes * 60000 < Date.now();
                const isNow = Date.now() >= job.scheduledFor && Date.now() < job.scheduledFor + job.durationMinutes * 60000;
                return (
                  <div key={job.id} className={`px-4 py-3 flex items-center gap-4 ${isPast ? 'opacity-50' : ''}`}>
                    <div className="font-mono text-xs text-paper-mute w-16">{time}</div>
                    <div className={`w-1 self-stretch rounded ${
                      job.type === 'lawn' ? 'bg-acid' : job.type === 'hvac' ? 'bg-blue-400' : 'bg-signal'
                    }`}/>
                    <div className="flex-1">
                      <div className="text-sm text-paper font-medium">{job.customerName}</div>
                      {job.address && <div className="text-[11px] text-paper-mute">{job.address}</div>}
                    </div>
                    <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded ${
                      job.type === 'lawn' ? 'bg-acid/10 text-acid' : job.type === 'hvac' ? 'bg-blue-400/10 text-blue-400' : 'bg-signal/10 text-signal'
                    }`}>{job.type}</span>
                    <span className="font-mono text-xs text-paper-mute w-16 text-right">${job.value}</span>
                    {isNow && (
                      <span className="font-mono text-[10px] text-acid flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse"/>NOW
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pipeline + AI stream */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Pipeline */}
          <div className="lg:col-span-2 bg-ink-2 border border-rule rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-rule flex justify-between items-center">
              <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase">Active Pipeline</div>
              <Link href="/leads" className="font-mono text-[10px] text-signal hover:text-signal-bright tracking-wider uppercase">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {[
                { key: 'new', label: 'New', items: grouped.new, color: 'signal' },
                { key: 'quoted', label: 'Quoted', items: grouped.quoted, color: 'paper' },
                { key: 'booked', label: 'Booked', items: grouped.booked, color: 'acid' },
              ].map((col) => (
                <div key={col.key} className="bg-ink border border-rule rounded-md p-2">
                  <div className="flex justify-between items-center font-mono text-[10px] text-paper-mute tracking-wider uppercase pb-2 mb-2 border-b border-rule">
                    <span>{col.label}</span>
                    <span className="bg-rule px-1.5 py-0.5 rounded-full text-[9px]">{col.items.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {col.items.length === 0 ? (
                      <div className="text-[11px] text-paper-dim italic px-2 py-3">empty</div>
                    ) : (
                      col.items.slice(0, 4).map((lead) => (
                        <Link
                          href={`/leads`}
                          key={lead.id}
                          className={`block bg-ink-2 border border-rule rounded p-2 hover:border-signal/30 transition-all border-l-2 ${
                            lead.type === 'lawn' ? 'border-l-acid' : lead.type === 'hvac' ? 'border-l-blue-400' : 'border-l-signal'
                          }`}>
                          <div className="text-xs font-medium text-paper truncate">{lead.name}</div>
                          <div className="flex justify-between items-center mt-1">
                            <span className={`font-mono text-[9px] uppercase px-1 py-0.5 rounded ${
                              lead.type === 'lawn' ? 'bg-acid/10 text-acid' : lead.type === 'hvac' ? 'bg-blue-400/10 text-blue-400' : 'bg-signal/10 text-signal'
                            }`}>
                              {lead.type}
                            </span>
                            <span className="font-mono text-[10px] text-paper-mute">${lead.value}</span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Stream */}
          <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-rule flex justify-between items-center">
              <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase">AI Activity</div>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-acid">
                <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse"/>
                LIVE
              </span>
            </div>
            <div className="divide-y divide-rule">
              {aiLog.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <div className="text-[11px] text-paper-dim font-mono">no activity yet</div>
                  <div className="text-xs text-paper-mute mt-1">AI tools will log here</div>
                </div>
              ) : (
                aiLog.slice(0, 8).map((e) => (
                  <div key={e.id} className="px-4 py-3 hover:bg-ink/40 transition-colors">
                    <div className="flex items-start gap-2">
                      <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                        e.type === 'quote'
                          ? 'bg-acid/10 text-acid border border-acid/20'
                          : e.type === 'review-reply'
                          ? 'bg-signal/10 text-signal border border-signal/20'
                          : 'bg-blue-400/10 text-blue-400 border border-blue-400/20'
                      }`}>
                        {e.type === 'quote' ? 'sent' : e.type === 'review-reply' ? 'review' : 'follow-up'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-paper leading-relaxed">{e.summary}</div>
                        <div className="font-mono text-[10px] text-paper-dim mt-1">{time(e.timestamp)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick AI tools */}
        <div className="bg-ink-2 border border-rule rounded-lg p-4">
          <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase mb-3">AI Tools</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QuickQuote />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickQuote() {
  const [desc, setDesc] = useState('');
  const [quote, setQuote] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!desc.trim()) return;
    setLoading(true);
    setQuote('');
    try {
      const res = await fetch('/api/ai/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: desc }),
      });
      const data = await res.json();
      setQuote(data.quote || data.error || 'No response');
    } catch (e: any) {
      setQuote('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="md:col-span-3 bg-ink border border-rule rounded-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[10px] text-signal uppercase tracking-wider">⚡ AI Quote Generator</span>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generate()}
          placeholder="e.g. Weekly mowing for 0.4 acre property in Maumee"
          className="flex-1 bg-ink-2 border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"
        />
        <button
          onClick={generate}
          disabled={loading || !desc.trim()}
          className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-sm font-medium disabled:opacity-50 transition-all">
          {loading ? '...' : 'Generate →'}
        </button>
      </div>
      {quote && (
        <div className="bg-ink-2 border border-rule rounded-md p-3 font-mono text-xs text-paper leading-relaxed whitespace-pre-wrap fade-up">
          {quote}
        </div>
      )}
    </div>
  );
}
