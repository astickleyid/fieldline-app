'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
};

const COLUMNS: { key: LeadStatus; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'booked', label: 'Booked' },
  { key: 'completed', label: 'Completed' },
  { key: 'lost', label: 'Lost' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'lawn' | 'hvac' | 'plumb'>('all');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  const { openSidebar } = useShell();

  useEffect(() => { load(); }, []);
  async function load() {
    const res = await fetch('/api/leads');
    const data = await res.json();
    setLeads(data.leads || []);
    setLoading(false);
  }

  async function changeStatus(leadId: string, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  function onDrop(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault();
    if (!draggedId) return;
    changeStatus(draggedId, status);
    setDraggedId(null);
    setDragOver(null);
  }

  const filtered = leads.filter((l) => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (search && !`${l.name} ${l.address || ''} ${l.notes || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total = filtered.reduce((s, l) => s + l.value, 0);
  const open = filtered.filter((l) => l.status === 'new' || l.status === 'quoted').length;

  return (
    <div>
      <TopBar
        title="Pipeline"
        subtitle={`${filtered.length} LEADS · ${open} OPEN · $${total.toLocaleString()} TOTAL`}
        onMenuClick={openSidebar}
        action={
          <button
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
            + New Lead
          </button>
        }
      />

      {/* Filter bar */}
      <div className="border-b border-rule px-4 md:px-6 h-12 flex items-center justify-between gap-3 overflow-x-auto bg-ink/40">
        <div className="flex items-center gap-3 min-w-max">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter leads..."
            className="bg-ink-2 border border-rule rounded-md px-3 py-1.5 text-xs text-paper placeholder-paper-dim outline-none focus:border-signal/40 w-48"
          />
          <div className="flex gap-1">
            {(['all', 'lawn', 'hvac', 'plumb'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all ${
                  filter === f ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper hover:bg-rule'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {(['kanban', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all ${
                view === v ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper hover:bg-rule'
              }`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {view === 'kanban' ? (
        <div className="p-4 md:p-6 overflow-x-auto">
          <div className="flex gap-3 min-w-max pb-4">
            {COLUMNS.map((col) => {
              const items = filtered.filter((l) => l.status === col.key);
              const colTotal = items.reduce((s, l) => s + l.value, 0);
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => onDrop(e, col.key)}
                  className={`w-[280px] shrink-0 bg-ink-2 border rounded-lg overflow-hidden transition-colors ${
                    dragOver === col.key ? 'border-signal/60 bg-signal/5' : 'border-rule'
                  }`}>
                  <div className="px-3 py-2.5 border-b border-rule flex justify-between items-center">
                    <div>
                      <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">{col.label}</div>
                      <div className="font-mono text-[10px] text-paper-dim mt-0.5">${colTotal.toLocaleString()}</div>
                    </div>
                    <span className="bg-rule px-1.5 py-0.5 rounded-full font-mono text-[10px] text-paper-mute">
                      {items.length}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 min-h-[400px]">
                    {items.length === 0 && (
                      <div className="text-center py-8 text-[11px] text-paper-dim italic">
                        {dragOver === col.key ? 'Drop here' : 'No leads'}
                      </div>
                    )}
                    {items.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onDragStart={() => setDraggedId(lead.id)}
                        onDragEnd={() => { setDraggedId(null); setDragOver(null); }}
                        dragging={draggedId === lead.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 md:p-6">
          <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-3">
                  {['Name', 'Status', 'Type', 'Value', 'Address', 'Source', 'Quote', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-[10px] text-paper-mute tracking-wider uppercase font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-rule hover:bg-ink/40">
                    <td className="px-3 py-2.5">
                      <Link href={`/leads/${l.id}`} className="text-paper hover:text-signal font-medium">{l.name}</Link>
                    </td>
                    <td className="px-3 py-2.5"><StatusPill status={l.status}/></td>
                    <td className="px-3 py-2.5"><TypePill type={l.type}/></td>
                    <td className="px-3 py-2.5 font-mono text-acid">${l.value}</td>
                    <td className="px-3 py-2.5 text-paper-mute text-xs truncate max-w-[200px]">{l.address || '—'}</td>
                    <td className="px-3 py-2.5 text-paper-mute text-xs">{l.source || '—'}</td>
                    <td className="px-3 py-2.5">{l.quote ? <span className="text-signal text-xs">⚡</span> : <span className="text-paper-dim text-xs">—</span>}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/leads/${l.id}`} className="text-paper-mute hover:text-paper text-xs font-mono">→</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-paper-mute text-sm">No leads match your filters.</div>
            )}
          </div>
        </div>
      )}

      {creating && <NewLeadModal onClose={() => setCreating(false)} onSaved={load} />}
    </div>
  );
}

function LeadCard({ lead, onDragStart, onDragEnd, dragging }: { lead: Lead; onDragStart: () => void; onDragEnd: () => void; dragging: boolean }) {
  const borderColor = lead.type === 'lawn' ? 'border-l-acid' : lead.type === 'hvac' ? 'border-l-blue-400' : lead.type === 'plumb' ? 'border-l-signal' : 'border-l-paper-mute';

  return (
    <Link
      href={`/leads/${lead.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`block bg-ink border border-rule border-l-2 ${borderColor} rounded p-3 hover:border-signal/30 transition-all group cursor-pointer ${
        dragging ? 'opacity-30 scale-95' : ''
      }`}>
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <div className="text-sm font-medium text-paper truncate">{lead.name}</div>
        <span className="font-mono text-[10px] text-acid font-semibold whitespace-nowrap">${lead.value}</span>
      </div>
      {lead.address && <div className="text-[11px] text-paper-mute truncate mb-2">{lead.address}</div>}
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-1.5">
          <TypePill type={lead.type} small/>
          {lead.quote && (
            <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-signal/10 text-signal border border-signal/20">
              ⚡ quote
            </span>
          )}
          {lead.source && (
            <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-rule text-paper-mute hidden md:inline">
              {lead.source.slice(0, 12)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  const colors: Record<LeadStatus, string> = {
    new: 'bg-signal/10 text-signal',
    quoted: 'bg-amber-400/10 text-amber-400',
    booked: 'bg-acid/10 text-acid',
    completed: 'bg-paper-dim text-paper-mute',
    lost: 'bg-red-400/10 text-red-400',
  };
  return <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded ${colors[status]}`}>{status}</span>;
}

function TypePill({ type, small = false }: { type: string; small?: boolean }) {
  const c = type === 'lawn' ? 'bg-acid/10 text-acid' : type === 'hvac' ? 'bg-blue-400/10 text-blue-400' : type === 'plumb' ? 'bg-signal/10 text-signal' : 'bg-rule text-paper-mute';
  return <span className={`font-mono uppercase px-1.5 py-0.5 rounded ${c} ${small ? 'text-[9px]' : 'text-[10px]'}`}>{type}</span>;
}

function NewLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'lawn' | 'hvac' | 'plumb' | 'other'>('lawn');
  const [value, setValue] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, address, type, status: 'new', value: Number(value), source, notes }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-ink-2 border border-rule rounded-xl w-full max-w-lg my-8 fade-up">
        <div className="px-5 py-3 border-b border-rule flex justify-between items-center">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">New Lead</div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *" value={name} onChange={setName} placeholder="Customer name" />
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
            <Field label="Source" value={source} onChange={setSource} placeholder="Google, Referral, etc." />
          </div>
          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Job details, preferences..."
              className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40 resize-none"
            />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-rule flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-paper-mute hover:text-paper">Cancel</button>
          <button
            onClick={save}
            disabled={saving || !name}
            className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-50">
            {saving ? '...' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">{label}</label>
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
