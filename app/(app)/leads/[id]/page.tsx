'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useShell } from '@/components/AppShell';
import TopBar from '@/components/TopBar';

type LeadStatus = 'new' | 'quoted' | 'booked' | 'completed' | 'lost';
type Lead = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  status: LeadStatus;
  type: 'lawn' | 'hvac' | 'plumb' | 'other';
  value: number;
  notes?: string;
  source?: string;
  tags?: string[];
  quote?: string;
  quoteGeneratedAt?: number;
  createdAt: number;
  updatedAt: number;
};

type Activity = {
  id: string;
  type: string;
  message: string;
  timestamp: number;
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const { openSidebar } = useShell();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  // AI tools
  const [genQuoteLoading, setGenQuoteLoading] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Book job
  const [showBook, setShowBook] = useState(false);
  const [bookDate, setBookDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [bookDuration, setBookDuration] = useState('60');
  const [booking, setBooking] = useState(false);

  // Note input
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => { load(); }, [leadId]);

  async function load() {
    setLoading(true);
    const [leadsRes, actRes] = await Promise.all([
      fetch('/api/leads').then((r) => r.json()),
      fetch(`/api/leads/${leadId}/activity`).then((r) => r.json()),
    ]);
    const found = (leadsRes.leads || []).find((l: Lead) => l.id === leadId);
    setLead(found || null);
    setEditForm(found || {});
    setActivity(actRes.activity || []);
    setLoading(false);
  }

  async function save() {
    if (!lead) return;
    setSaving(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    setEditing(false);
    load();
  }

  async function changeStatus(status: LeadStatus) {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function generateQuote() {
    if (!lead) return;
    setGenQuoteLoading(true);
    const desc = `${lead.type} job for ${lead.name}${lead.address ? ' at ' + lead.address : ''}${lead.notes ? '. Notes: ' + lead.notes : ''}`;
    await fetch('/api/ai/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: desc, leadId: lead.id }),
    });
    setGenQuoteLoading(false);
    load();
  }

  async function resetQuote() {
    if (!lead || !confirm('Clear saved quote?')) return;
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote: '', quoteGeneratedAt: 0 }),
    });
    load();
  }

  async function generateFollowUp() {
    if (!lead) return;
    setFollowUpLoading(true);
    setFollowUp('');
    const days = lead.quoteGeneratedAt ? Math.max(1, Math.floor((Date.now() - lead.quoteGeneratedAt) / 86400000)) : 3;
    const res = await fetch('/api/ai/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadName: lead.name, daysSinceQuote: days, jobDescription: `${lead.type} job — ${lead.notes || ''}` }),
    });
    const data = await res.json();
    setFollowUp(data.message || data.error || 'Error');
    setFollowUpLoading(false);
  }

  async function bookJob() {
    if (!lead) return;
    setBooking(true);
    await fetch(`/api/leads/${lead.id}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledFor: new Date(bookDate).getTime(),
        durationMinutes: Number(bookDuration),
      }),
    });
    setBooking(false);
    setShowBook(false);
    load();
  }

  async function addNote() {
    if (!lead || !newNote.trim()) return;
    setAddingNote(true);
    await fetch(`/api/leads/${lead.id}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'note-added', message: newNote }),
    });
    setNewNote('');
    setAddingNote(false);
    load();
  }

  async function createInvoice() {
    if (!lead) return;
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        customerName: lead.name,
        customerEmail: lead.email,
        amount: lead.value,
        status: 'draft',
        lineItems: [{ description: `${lead.type} services — ${lead.notes || lead.name}`, amount: lead.value }],
      }),
    });
    const data = await res.json();
    if (data.invoice) router.push(`/invoices?highlight=${data.invoice.id}`);
  }

  async function remove() {
    if (!lead || !confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
    router.push('/leads');
  }

  if (loading) return <div className="p-8 text-center text-paper-mute font-mono text-xs">Loading...</div>;
  if (!lead) return (
    <div className="p-8 text-center">
      <div className="text-paper-mute mb-4">Lead not found</div>
      <Link href="/leads" className="text-signal hover:text-signal-bright text-sm">← Back to pipeline</Link>
    </div>
  );

  const fmtDate = (t: number) => {
    const d = Date.now() - t;
    if (d < 60_000) return 'just now';
    if (d < 3_600_000) return Math.floor(d / 60_000) + 'm ago';
    if (d < 86_400_000) return Math.floor(d / 3_600_000) + 'h ago';
    if (d < 86_400_000 * 7) return Math.floor(d / 86_400_000) + 'd ago';
    return new Date(t).toLocaleDateString();
  };

  return (
    <div>
      <TopBar
        title={lead.name}
        subtitle={`${lead.id.slice(-6).toUpperCase()} · ${lead.status.toUpperCase()} · $${lead.value}`}
        onMenuClick={openSidebar}
        action={
          <div className="flex items-center gap-2">
            <Link href="/leads" className="px-3 py-1.5 border border-rule rounded-md text-xs text-paper-mute hover:text-paper hover:border-paper-dim hidden sm:inline-block">← Back</Link>
            {!editing && (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-paper-dim hover:bg-rule text-paper rounded-md text-xs font-medium">Edit</button>
            )}
            {editing && (
              <button onClick={save} disabled={saving} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
                {saving ? '...' : 'Save'}
              </button>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT — main info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status pipeline */}
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Status</div>
              <div className="flex flex-wrap gap-1">
                {(['new', 'quoted', 'booked', 'completed', 'lost'] as LeadStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    disabled={s === lead.status}
                    className={`px-3 py-1.5 rounded font-mono text-[10px] tracking-wider uppercase transition-all ${
                      s === lead.status
                        ? 'bg-signal text-white cursor-default'
                        : 'bg-rule text-paper-mute hover:text-paper hover:bg-paper-dim'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow label="Name" value={editing ? <input className="bg-ink border border-rule rounded px-2 py-1 text-sm w-full" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}/> : lead.name}/>
                <DetailRow label="Phone" value={editing ? <input className="bg-ink border border-rule rounded px-2 py-1 text-sm w-full" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}/> : (lead.phone ? <a href={`tel:${lead.phone}`} className="text-signal hover:text-signal-bright">{lead.phone}</a> : '—')}/>
                <DetailRow label="Email" value={editing ? <input className="bg-ink border border-rule rounded px-2 py-1 text-sm w-full" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}/> : (lead.email ? <a href={`mailto:${lead.email}`} className="text-signal hover:text-signal-bright">{lead.email}</a> : '—')}/>
                <DetailRow label="Value" value={editing ? <input type="number" className="bg-ink border border-rule rounded px-2 py-1 text-sm w-full" value={editForm.value || 0} onChange={(e) => setEditForm({ ...editForm, value: Number(e.target.value) })}/> : <span className="font-mono text-acid">${lead.value}</span>}/>
                <DetailRow label="Address" value={editing ? <input className="bg-ink border border-rule rounded px-2 py-1 text-sm w-full" value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}/> : (lead.address || '—')} colSpan={2}/>
                <DetailRow label="Source" value={editing ? <input className="bg-ink border border-rule rounded px-2 py-1 text-sm w-full" value={editForm.source || ''} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}/> : (lead.source || '—')}/>
                <DetailRow label="Trade" value={lead.type.toUpperCase()}/>
                <DetailRow label="Created" value={new Date(lead.createdAt).toLocaleDateString()}/>
                <DetailRow label="Updated" value={fmtDate(lead.updatedAt)}/>
              </div>
              {(editing || lead.notes) && (
                <div className="mt-4 pt-4 border-t border-rule">
                  <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-2">Notes</div>
                  {editing ? (
                    <textarea
                      rows={3}
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full bg-ink border border-rule rounded px-3 py-2 text-sm text-paper resize-none"/>
                  ) : (
                    <div className="text-sm text-paper whitespace-pre-wrap">{lead.notes}</div>
                  )}
                </div>
              )}
            </div>

            {/* AI Quote */}
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-mono text-[10px] text-signal tracking-wider uppercase mb-0.5">⚡ AI Quote</div>
                  {lead.quoteGeneratedAt && <div className="font-mono text-[10px] text-paper-dim">saved · {new Date(lead.quoteGeneratedAt).toLocaleString()}</div>}
                </div>
                <div className="flex items-center gap-3">
                  {lead.quote && (
                    <>
                      <button onClick={() => navigator.clipboard.writeText(lead.quote!)} className="text-[11px] text-paper-mute hover:text-paper">Copy</button>
                      <button onClick={resetQuote} className="text-[11px] text-paper-mute hover:text-red-400">Reset</button>
                    </>
                  )}
                  <button onClick={generateQuote} disabled={genQuoteLoading} className="text-[11px] text-signal hover:text-signal-bright font-medium disabled:opacity-40">
                    {genQuoteLoading ? 'Generating...' : lead.quote ? 'Regenerate →' : 'Generate quote →'}
                  </button>
                </div>
              </div>
              {lead.quote ? (
                <div className="bg-ink border border-rule rounded-md p-3 font-mono text-xs text-paper leading-relaxed whitespace-pre-wrap">
                  {lead.quote}
                </div>
              ) : (
                <div className="bg-ink border border-dashed border-rule rounded-md p-4 text-center">
                  <div className="text-[11px] text-paper-dim italic">No quote yet — click Generate to create one in your voice.</div>
                </div>
              )}
            </div>

            {/* AI Follow-up */}
            {(lead.status === 'quoted' || lead.status === 'new') && (
              <div className="bg-ink-2 border border-rule rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-[10px] text-signal tracking-wider uppercase">⚡ AI Follow-up Text</div>
                  <button onClick={generateFollowUp} disabled={followUpLoading} className="text-[11px] text-signal hover:text-signal-bright font-medium disabled:opacity-40">
                    {followUpLoading ? 'Writing...' : followUp ? 'Regenerate →' : 'Draft a follow-up →'}
                  </button>
                </div>
                {followUp && (
                  <div className="bg-ink border border-rule rounded-md p-3 text-sm text-paper">
                    {followUp}
                    <div className="mt-2 pt-2 border-t border-rule flex justify-end">
                      <button onClick={() => navigator.clipboard.writeText(followUp)} className="text-[11px] text-paper-mute hover:text-paper">Copy text</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Actions</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowBook(!showBook)} className="px-3 py-1.5 bg-acid hover:bg-acid/80 text-ink rounded-md text-xs font-semibold">
                  ▦ Book Job
                </button>
                <button onClick={createInvoice} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
                  $ Create Invoice
                </button>
                {lead.phone && <a href={`sms:${lead.phone}`} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">Text</a>}
                {lead.phone && <a href={`tel:${lead.phone}`} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">Call</a>}
                {lead.email && <a href={`mailto:${lead.email}`} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">Email</a>}
                <button onClick={remove} className="px-3 py-1.5 border border-red-400/30 text-red-400 hover:bg-red-400/10 rounded-md text-xs ml-auto">Delete</button>
              </div>

              {showBook && (
                <div className="mt-4 pt-4 border-t border-rule space-y-3 fade-up">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Date &amp; Time</label>
                      <input type="datetime-local" value={bookDate} onChange={(e) => setBookDate(e.target.value)} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm outline-none"/>
                    </div>
                    <div>
                      <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Duration (min)</label>
                      <input type="number" value={bookDuration} onChange={(e) => setBookDuration(e.target.value)} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm outline-none"/>
                    </div>
                  </div>
                  <button onClick={bookJob} disabled={booking} className="w-full py-2 bg-acid hover:bg-acid/80 text-ink rounded-md text-xs font-semibold">
                    {booking ? 'Booking...' : 'Confirm Booking →'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — activity timeline */}
          <div className="space-y-4">
            <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-rule flex justify-between items-center">
                <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">Activity</div>
                <span className="font-mono text-[10px] text-paper-dim">{activity.length}</span>
              </div>
              <div className="p-3 border-b border-rule">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40 resize-none"/>
                <div className="flex justify-end mt-2">
                  <button onClick={addNote} disabled={addingNote || !newNote.trim()} className="px-3 py-1 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-40">
                    {addingNote ? '...' : 'Add Note'}
                  </button>
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {activity.length === 0 ? (
                  <div className="p-6 text-center text-[11px] text-paper-dim italic">No activity yet</div>
                ) : (
                  activity.map((a) => (
                    <div key={a.id} className="px-4 py-3 border-b border-rule last:border-0">
                      <div className="flex items-start gap-2">
                        <ActivityIcon type={a.type}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-paper leading-relaxed">{a.message}</div>
                          <div className="font-mono text-[10px] text-paper-dim mt-1">{fmtDate(a.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, colSpan = 1 }: { label: string; value: React.ReactNode; colSpan?: number }) {
  return (
    <div className={colSpan === 2 ? 'sm:col-span-2' : ''}>
      <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-0.5">{label}</div>
      <div className="text-sm text-paper">{value}</div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { color: string; symbol: string }> = {
    'lead-created': { color: 'text-paper-mute', symbol: '✦' },
    'lead-status-changed': { color: 'text-signal', symbol: '↻' },
    'note-added': { color: 'text-paper', symbol: '✎' },
    'quote-generated': { color: 'text-signal', symbol: '⚡' },
    'job-scheduled': { color: 'text-acid', symbol: '▦' },
    'job-completed': { color: 'text-acid', symbol: '✓' },
    'invoice-sent': { color: 'text-signal', symbol: '$' },
    'invoice-paid': { color: 'text-acid', symbol: '$' },
    'sms-sent': { color: 'text-blue-400', symbol: '💬' },
    'review-received': { color: 'text-yellow-400', symbol: '★' },
    'review-replied': { color: 'text-yellow-400', symbol: '↩' },
  };
  const meta = map[type] || { color: 'text-paper-mute', symbol: '·' };
  return <span className={`${meta.color} font-mono text-xs w-4 text-center shrink-0 mt-0.5`}>{meta.symbol}</span>;
}
