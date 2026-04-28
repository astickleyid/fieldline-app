'use client';

import { useEffect, useState } from 'react';

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
  quote?: string;
  quoteGeneratedAt?: number;
  createdAt: number;
};

const COLUMNS: { key: LeadStatus; label: string; tint: string }[] = [
  { key: 'new', label: 'New Lead', tint: 'signal' },
  { key: 'quoted', label: 'Quoted', tint: 'paper' },
  { key: 'booked', label: 'Booked', tint: 'acid' },
  { key: 'completed', label: 'Completed', tint: 'paper-mute' },
  { key: 'lost', label: 'Lost', tint: 'paper-dim' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'lawn' | 'hvac' | 'plumb'>('all');

  const filtered = leads.filter((l) => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (search && !`${l.name} ${l.address || ''} ${l.notes || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  useEffect(() => { load(); }, []);
  async function load() {
    const res = await fetch('/api/leads');
    const data = await res.json();
    setLeads(data.leads || []);
    setLoading(false);
  }

  async function changeStatus(lead: Lead, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div>
      <div className="border-b border-rule px-6 h-14 flex items-center justify-between sticky top-0 bg-ink/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-base font-medium">Pipeline</h1>
            <div className="font-mono text-[10px] text-paper-dim tracking-wider mt-0.5">
              {leads.length} TOTAL · {leads.filter((l) => l.status === 'new' || l.status === 'quoted').length} OPEN
            </div>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="bg-ink-2 border border-rule rounded-md px-3 py-1.5 text-xs text-paper placeholder-paper-dim outline-none focus:border-signal/40 w-48"
          />
          <div className="flex gap-1">
            {(['all', 'lawn', 'hvac', 'plumb'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all ${
                  filter === f ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium transition-all">
          + New Lead
        </button>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-4">
          {COLUMNS.map((col) => {
            const items = filtered.filter((l) => l.status === col.key);
            const total = items.reduce((s, l) => s + l.value, 0);
            return (
              <div key={col.key} className="w-[280px] shrink-0 bg-ink-2 border border-rule rounded-lg overflow-hidden">
                <div className="px-3 py-2.5 border-b border-rule flex justify-between items-center">
                  <div>
                    <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">{col.label}</div>
                    <div className="font-mono text-[10px] text-paper-dim mt-0.5">${total.toLocaleString()}</div>
                  </div>
                  <span className="bg-rule px-1.5 py-0.5 rounded-full font-mono text-[10px] text-paper-mute">
                    {items.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 min-h-[400px]">
                  {items.length === 0 && (
                    <div className="text-center py-8 text-[11px] text-paper-dim italic">No leads</div>
                  )}
                  {items.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setEditing(lead)}
                      onMove={(next) => changeStatus(lead, next)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {creating && <LeadFormModal onClose={() => setCreating(false)} onSaved={load} />}
      {editing && <LeadFormModal lead={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

function LeadCard({ lead, onClick, onMove }: { lead: Lead; onClick: () => void; onMove: (s: LeadStatus) => void }) {
  const tagColor = lead.type === 'lawn' ? 'bg-acid/10 text-acid' : lead.type === 'hvac' ? 'bg-blue-400/10 text-blue-400' : 'bg-signal/10 text-signal';
  const borderColor = lead.type === 'lawn' ? 'border-l-acid' : lead.type === 'hvac' ? 'border-l-blue-400' : 'border-l-signal';
  const next = nextStatus(lead.status);

  return (
    <div
      className={`bg-ink border border-rule border-l-2 ${borderColor} rounded p-3 cursor-pointer hover:border-signal/30 transition-all group`}
      onClick={onClick}>
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <div className="text-sm font-medium text-paper truncate">{lead.name}</div>
        <span className="font-mono text-[10px] text-acid font-semibold whitespace-nowrap">
          ${lead.value}
        </span>
      </div>
      {lead.address && <div className="text-[11px] text-paper-mute truncate mb-2">{lead.address}</div>}
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded ${tagColor}`}>
            {lead.type}
          </span>
          {lead.quote && (
            <span
              title="AI quote saved"
              className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-signal/10 text-signal border border-signal/20">
              ⚡ quote
            </span>
          )}
        </div>
        {next && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove(next); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px] text-paper-mute hover:text-signal">
            → {next}
          </button>
        )}
      </div>
    </div>
  );
}

function nextStatus(s: LeadStatus): LeadStatus | null {
  const order: LeadStatus[] = ['new', 'quoted', 'booked', 'completed'];
  const i = order.indexOf(s);
  return i === -1 || i === order.length - 1 ? null : order[i + 1];
}

function LeadFormModal({ lead, onClose, onSaved }: { lead?: Lead; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(lead?.name || '');
  const [phone, setPhone] = useState(lead?.phone || '');
  const [email, setEmail] = useState(lead?.email || '');
  const [address, setAddress] = useState(lead?.address || '');
  const [type, setType] = useState<Lead['type']>(lead?.type || 'lawn');
  const [status, setStatus] = useState<LeadStatus>(lead?.status || 'new');
  const [value, setValue] = useState(String(lead?.value || ''));
  const [notes, setNotes] = useState(lead?.notes || '');
  const [saving, setSaving] = useState(false);

  // AI quote helper
  const [quote, setQuote] = useState(lead?.quote || '');
  const [quoteAt, setQuoteAt] = useState<number | undefined>(lead?.quoteGeneratedAt);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');

  // Book job state
  const [showBook, setShowBook] = useState(false);
  const [bookDate, setBookDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [bookDuration, setBookDuration] = useState('60');
  const [booking, setBooking] = useState(false);

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
    onSaved();
    onClose();
  }

  async function save() {
    setSaving(true);
    const body = { name, phone, email, address, type, status, value: Number(value), notes };
    const url = lead ? `/api/leads/${lead.id}` : '/api/leads';
    await fetch(url, {
      method: lead ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  async function generateQuote() {
    setGenLoading(true);
    setQuote('');
    setGenError('');
    const desc = `${type} job for ${name}${address ? ' at ' + address : ''}${notes ? '. Notes: ' + notes : ''}`;
    try {
      const res = await fetch('/api/ai/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: desc, leadId: lead?.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setGenError(data.error || `HTTP ${res.status}`);
        setGenLoading(false);
        return;
      }
      const generated = data.quote || '';
      setQuote(generated);
      setQuoteAt(Date.now());
      if (lead) {
        if (status === 'new') setStatus('quoted');
        onSaved();
      }
    } catch (e: any) {
      setGenError(e.message || 'Network error');
    } finally {
      setGenLoading(false);
    }
  }

  async function resetQuote() {
    if (!lead) {
      setQuote('');
      setQuoteAt(undefined);
      return;
    }
    if (!confirm('Clear this saved quote?')) return;
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote: '', quoteGeneratedAt: 0 }),
    });
    setQuote('');
    setQuoteAt(undefined);
    onSaved();
  }

  async function copyQuote() {
    if (!quote) return;
    try {
      await navigator.clipboard.writeText(quote);
    } catch {}
  }

  async function remove() {
    if (!lead || !confirm('Delete this lead?')) return;
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-ink-2 border border-rule rounded-xl w-full max-w-xl my-8 fade-up">
        <div className="px-5 py-3 border-b border-rule flex justify-between items-center">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">
            {lead ? `Edit Lead · ${lead.id.slice(-6)}` : 'New Lead'}
          </div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value={name} onChange={setName} placeholder="Customer name" required />
            <Field label="Value" value={value} onChange={setValue} placeholder="280" type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="(419) 555-1234" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="customer@email.com" type="email" />
          </div>
          <Field label="Address" value={address} onChange={setAddress} placeholder="1421 Oak St, Toledo, OH" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Trade</label>
              <div className="grid grid-cols-4 gap-1">
                {(['lawn', 'hvac', 'plumb', 'other'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-1.5 text-[11px] rounded border transition-all ${
                      type === t ? 'border-signal bg-signal/10 text-signal' : 'border-rule text-paper-mute hover:text-paper'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm outline-none focus:border-signal/40">
                <option value="new">New Lead</option>
                <option value="quoted">Quoted</option>
                <option value="booked">Booked</option>
                <option value="completed">Completed</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Job details, customer preferences, etc."
              className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40 resize-none"
            />
          </div>

          {/* Book Job */}
          {lead && (
            <div className="border-t border-rule pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-acid tracking-wider uppercase">▦ Book Job</span>
                <button
                  onClick={() => setShowBook(!showBook)}
                  className="text-[11px] text-acid hover:text-paper font-medium">
                  {showBook ? 'Hide' : 'Schedule this lead →'}
                </button>
              </div>
              {showBook && (
                <div className="bg-ink border border-rule rounded-md p-3 space-y-3 fade-up">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={bookDate}
                        onChange={(e) => setBookDate(e.target.value)}
                        className="w-full bg-ink-2 border border-rule rounded-md px-3 py-2 text-paper text-sm outline-none focus:border-acid/40"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Duration (min)</label>
                      <input
                        type="number"
                        value={bookDuration}
                        onChange={(e) => setBookDuration(e.target.value)}
                        className="w-full bg-ink-2 border border-rule rounded-md px-3 py-2 text-paper text-sm outline-none focus:border-acid/40"
                      />
                    </div>
                  </div>
                  <button
                    onClick={bookJob}
                    disabled={booking}
                    className="w-full py-2 bg-acid hover:bg-acid/80 text-ink rounded-md text-xs font-semibold transition-all disabled:opacity-50">
                    {booking ? 'Booking...' : 'Confirm Booking →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Quote */}
          <div className="border-t border-rule pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-signal tracking-wider uppercase">⚡ AI Quote</span>
                {quoteAt && (
                  <span className="font-mono text-[10px] text-paper-dim">
                    saved · {new Date(quoteAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {quote && (
                  <button
                    onClick={copyQuote}
                    className="text-[11px] text-paper-mute hover:text-paper font-medium">
                    Copy
                  </button>
                )}
                {quote && (
                  <button
                    onClick={resetQuote}
                    className="text-[11px] text-paper-mute hover:text-red-400 font-medium">
                    Reset
                  </button>
                )}
                <button
                  onClick={generateQuote}
                  disabled={genLoading || !name}
                  className="text-[11px] text-signal hover:text-signal-bright font-medium disabled:opacity-40">
                  {genLoading ? 'Generating...' : quote ? 'Regenerate →' : 'Generate quote →'}
                </button>
              </div>
            </div>
            {quote ? (
              <div className="bg-ink border border-rule rounded-md p-3 font-mono text-xs text-paper leading-relaxed whitespace-pre-wrap fade-up">
                {quote}
              </div>
            ) : genError ? (
              <div className="bg-red-500/5 border border-red-500/30 rounded-md p-3 font-mono text-xs text-red-400 leading-relaxed">
                Error: {genError}
              </div>
            ) : (
              <div className="bg-ink border border-dashed border-rule rounded-md p-4 text-center">
                <div className="text-[11px] text-paper-dim italic">No quote yet — click Generate to create one in your voice.</div>
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-rule flex justify-between items-center">
          {lead && (
            <button onClick={remove} className="text-[11px] text-red-400 hover:text-red-300 font-mono tracking-wide">
              Delete
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-xs text-paper-mute hover:text-paper transition-colors">Cancel</button>
            <button
              onClick={save}
              disabled={saving || !name}
              className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-50 transition-all">
              {saving ? '...' : lead ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text', required = false,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">
        {label}{required && <span className="text-signal ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"
      />
    </div>
  );
}
