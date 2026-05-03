'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Stats = { revenueMTD: number; jobsBooked: number; pipelineValue: number; rating: number; reviewCount: number; customerCount: number; leadConversionRate: number };
type AILogEntry = { id: string; type: string; summary: string; timestamp: number };
type Lead = { id: string; name: string; status: string; type: string; value: number; address?: string; aiScore?: number };
type Job = { id: string; customerName: string; scheduledFor: number; durationMinutes: number; address?: string; type: string; value: number };
type Briefing = { text: string; generatedAt: number; date: string };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [aiLog, setAILog] = useState<AILogEntry[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [todayJobs, setTodayJobs] = useState<Job[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const { openSidebar } = useShell();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function loadDashboard() {
    const [s, l, j, b] = await Promise.all([
      fetch('/api/stats').then((r) => r.json()),
      fetch('/api/leads').then((r) => r.json()),
      fetch('/api/jobs').then((r) => r.json()),
      fetch('/api/ai/briefing').then((r) => r.json()),
    ]);
    setStats(s.stats);
    setAILog(s.aiLog || []);
    setLeads(l.leads || []);
    setBriefing(b.briefing);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const todays = (j.jobs || []).filter((job: Job) => job.scheduledFor >= today.getTime() && job.scheduledFor < tomorrow.getTime())
      .sort((a: Job, b: Job) => a.scheduledFor - b.scheduledFor);
    setTodayJobs(todays);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
    const onFocus = () => loadDashboard();
    const onVis = () => { if (document.visibilityState === 'visible') loadDashboard(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  async function generateBriefing() {
    setBriefingLoading(true);
    const res = await fetch('/api/ai/briefing', { method: 'POST' });
    const data = await res.json();
    setBriefing(data.briefing);
    setBriefingLoading(false);
  }

  const fmt = (n: number) => '$' + n.toLocaleString();
  const time = (t: number) => {
    const d = Date.now() - t;
    if (d < 60_000) return 'just now';
    if (d < 3_600_000) return Math.floor(d / 60_000) + 'm ago';
    if (d < 86_400_000) return Math.floor(d / 3_600_000) + 'h ago';
    return Math.floor(d / 86_400_000) + 'd ago';
  };

  const grouped = {
    new: leads.filter((l) => l.status === 'new'),
    quoted: leads.filter((l) => l.status === 'quoted'),
    booked: leads.filter((l) => l.status === 'booked'),
  };

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={`${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
        onMenuClick={openSidebar}
        action={<Link href="/leads" className="px-3 py-1.5 text-xs border border-rule rounded-md text-paper-mute hover:text-paper hover:border-paper-dim">+ New Lead</Link>}
      />

      <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
        {/* AI Daily Briefing */}
        <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-rule flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-signal tracking-wider uppercase">⚡ Daily Briefing</span>
              {briefing && <span className="font-mono text-[10px] text-paper-dim">{new Date(briefing.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
            </div>
            <button
              onClick={generateBriefing}
              disabled={briefingLoading}
              className="text-[11px] text-signal hover:text-signal-bright font-medium disabled:opacity-40">
              {briefingLoading ? 'Writing...' : briefing ? 'Refresh →' : 'Generate →'}
            </button>
          </div>
          <div className="p-4">
            {briefing ? (
              <div className="text-sm text-paper leading-relaxed whitespace-pre-wrap font-serif" style={{ lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: briefing.text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-sans text-paper font-semibold">$1</strong>').replace(/\n/g, '<br/>') }}
              />
            ) : (
              <div className="text-sm text-paper-mute italic">
                Click <span className="text-signal">Generate</span> to get your AI-powered morning briefing — a sharp summary of what needs your attention today.
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Revenue MTD', value: stats ? fmt(stats.revenueMTD) : '—', delta: stats ? `${stats.leadConversionRate}% conv` : '—' },
            { label: 'Jobs Booked', value: stats?.jobsBooked ?? '—', delta: `this month` },
            { label: 'Open Pipeline', value: stats ? fmt(stats.pipelineValue) : '—', delta: `${grouped.new.length + grouped.quoted.length} leads` },
            { label: 'Customers', value: stats?.customerCount ?? '—', delta: stats ? `${stats.rating.toFixed(1)}★ avg` : '—' },
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
                <div className="text-[11px] text-paper-dim mt-0.5">{todayJobs.length} {todayJobs.length === 1 ? 'job' : 'jobs'} · {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              </div>
              <Link href="/calendar" className="font-mono text-[10px] text-signal hover:text-signal-bright tracking-wider uppercase">Full schedule →</Link>
            </div>
            <div className="divide-y divide-rule">
              {todayJobs.map((job) => {
                const t = new Date(job.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const isPast = job.scheduledFor + job.durationMinutes * 60000 < Date.now();
                const isNow = Date.now() >= job.scheduledFor && Date.now() < job.scheduledFor + job.durationMinutes * 60000;
                return (
                  <div key={job.id} className={`px-4 py-3 flex items-center gap-3 ${isPast ? 'opacity-50' : ''}`}>
                    <div className="font-mono text-xs text-paper-mute w-16 shrink-0">{t}</div>
                    <div className={`w-1 self-stretch rounded ${
                      job.type === 'lawn' ? 'bg-acid' : job.type === 'hvac' ? 'bg-blue-400' : 'bg-signal'
                    }`}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-paper font-medium truncate">{job.customerName}</div>
                      {job.address && <div className="text-[11px] text-paper-mute truncate">{job.address}</div>}
                    </div>
                    <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded ${
                      job.type === 'lawn' ? 'bg-acid/10 text-acid' : job.type === 'hvac' ? 'bg-blue-400/10 text-blue-400' : 'bg-signal/10 text-signal'
                    }`}>{job.type}</span>
                    <span className="font-mono text-xs text-paper-mute w-16 text-right hidden sm:inline">${job.value}</span>
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

        {/* Pipeline + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-ink-2 border border-rule rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-rule flex justify-between items-center">
              <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase">Pipeline</div>
              <Link href="/leads" className="font-mono text-[10px] text-signal hover:text-signal-bright tracking-wider uppercase">View all →</Link>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {[
                { key: 'new', label: 'New', items: grouped.new },
                { key: 'quoted', label: 'Quoted', items: grouped.quoted },
                { key: 'booked', label: 'Booked', items: grouped.booked },
              ].map((col) => (
                <div key={col.key} className="bg-ink border border-rule rounded-md p-2">
                  <div className="flex justify-between items-center font-mono text-[10px] text-paper-mute tracking-wider uppercase pb-2 mb-2 border-b border-rule">
                    <span>{col.label}</span>
                    <span className="bg-rule px-1.5 py-0.5 rounded-full text-[9px]">{col.items.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {col.items.length === 0 ? (
                      <div className="text-[11px] text-paper-dim italic px-2 py-3">empty</div>
                    ) : col.items.slice(0, 4).map((lead) => (
                      <Link href={`/leads/${lead.id}`} key={lead.id} className={`block bg-ink-2 border border-rule rounded p-2 hover:border-signal/30 transition-all border-l-2 ${
                        lead.type === 'lawn' ? 'border-l-acid' : lead.type === 'hvac' ? 'border-l-blue-400' : 'border-l-signal'
                      }`}>
                        <div className="text-xs font-medium text-paper truncate">{lead.name}</div>
                        <div className="flex justify-between items-center mt-1">
                          <span className={`font-mono text-[9px] uppercase px-1 py-0.5 rounded ${
                            lead.type === 'lawn' ? 'bg-acid/10 text-acid' : lead.type === 'hvac' ? 'bg-blue-400/10 text-blue-400' : 'bg-signal/10 text-signal'
                          }`}>{lead.type}</span>
                          <span className="font-mono text-[10px] text-paper-mute">${lead.value}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-rule flex justify-between items-center">
              <div className="font-mono text-[11px] text-paper-mute tracking-wider uppercase">AI Activity</div>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-acid">
                <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse"/>LIVE
              </span>
            </div>
            <div className="divide-y divide-rule max-h-[400px] overflow-y-auto">
              {aiLog.length === 0 ? (
                <div className="px-4 py-6 text-center text-[11px] text-paper-dim font-mono">no activity yet</div>
              ) : aiLog.slice(0, 10).map((e) => (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                      e.type === 'quote' ? 'bg-acid/10 text-acid border border-acid/20' :
                      e.type === 'review-reply' ? 'bg-signal/10 text-signal border border-signal/20' :
                      'bg-blue-400/10 text-blue-400 border border-blue-400/20'
                    }`}>
                      {e.type === 'quote' ? 'sent' : e.type === 'review-reply' ? 'review' : 'follow-up'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-paper leading-relaxed">{e.summary}</div>
                      <div className="font-mono text-[10px] text-paper-dim mt-1">{time(e.timestamp)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick AI quote */}
        <div className="bg-ink-2 border border-rule rounded-lg p-4">
          <QuickQuote/>
        </div>
      </div>
    </div>
  );
}

function QuickQuote() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  async function quickAdd() {
    if (!name.trim() || !desc.trim()) return;
    setLoading(true); setCreatedLeadId(null); setAiError(null);
    try {
      // Step 1: Create lead
      const leadRes = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, notes: desc,
          value: Number(value) || 0,
          status: 'new',
          type: 'lawn',
          source: 'Quick add',
        }),
      });
      const leadData = await leadRes.json();
      const leadId = leadData.lead?.id;
      if (!leadId) throw new Error('Lead creation failed');

      // Step 2: Try to generate AI quote (which auto-moves to "quoted")
      // If AI fails, we still keep the lead — user can write quote manually
      try {
        const quoteRes = await fetch('/api/ai/quote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription: desc, leadId }),
        });
        if (!quoteRes.ok) {
          const err = await quoteRes.json().catch(() => ({}));
          setAiError(err.error || 'AI quote failed — lead saved, write quote manually.');
        }
      } catch {
        setAiError('AI quote failed — lead saved, write quote manually.');
      }

      setCreatedLeadId(leadId);
      setName(''); setDesc(''); setValue('');
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || 'Could not create lead — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[10px] text-signal uppercase tracking-wider">⚡ Quick Add Lead + AI Quote</span>
        <span className="text-[10px] text-paper-dim font-mono">— creates a real lead with an AI-generated quote in one click</span>
      </div>
      {createdLeadId ? (
        <div className="space-y-2 fade-up">
          <div className={`border rounded-md p-3 flex items-center justify-between gap-3 ${
            aiError ? 'bg-amber-400/10 border-amber-400/30' : 'bg-acid/10 border-acid/30'
          }`}>
            <div>
              <div className={`text-sm font-mono ${aiError ? 'text-amber-400' : 'text-acid'}`}>
                {aiError ? '⚠ Lead saved (without AI quote)' : '✓ Lead created and quoted'}
              </div>
              <div className="text-xs text-paper-mute mt-0.5">
                {aiError || 'Click below to view, edit, or send to customer'}
              </div>
            </div>
            <Link href={`/leads/${createdLeadId}`} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium whitespace-nowrap">
              View Lead →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto_auto] gap-2">
          <input
            type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer name"
            className="bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"
          />
          <input
            type="text" value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
            placeholder="Job description (e.g. weekly mowing 0.4 acre property)"
            className="bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"
          />
          <input
            type="number" value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="$"
            className="w-20 bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"
          />
          <button onClick={quickAdd} disabled={loading || !name.trim() || !desc.trim()} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-sm font-medium disabled:opacity-50 whitespace-nowrap">
            {loading ? '...' : 'Add + Quote →'}
          </button>
        </div>
      )}
    </div>
  );
}
