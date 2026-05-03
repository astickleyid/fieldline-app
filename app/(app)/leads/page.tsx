'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useShell } from '@/components/AppShell';
import { useConfirm } from '@/components/Confirm';
import { useToast } from '@/components/Toast';
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
  aiScore?: number;
  aiScoreReasoning?: string;
  aiScoredAt?: number;
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
  const [importing, setImporting] = useState(false);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'lawn' | 'hvac' | 'plumb'>('all');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scoring, setScoring] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'score' | 'value'>('recent');
  const { openSidebar } = useShell();
  const { confirm } = useConfirm();
  const { toast } = useToast();

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
  }, []);
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

  async function scoreAll() {
    setScoring(true);
    await fetch('/api/ai/score', { method: 'POST' });
    setScoring(false);
    load();
  }

  async function bulkAction(action: 'delete' | 'set-status', payload?: any) {
    if (selected.size === 0) return;
    if (action === 'delete') {
      const ok = await confirm({
        title: `Delete ${selected.size} ${selected.size === 1 ? 'lead' : 'leads'}?`,
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
    }

    const count = selected.size;
    await fetch('/api/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action, payload }),
    });
    setSelected(new Set());
    toast(action === 'delete' ? `${count} ${count === 1 ? 'lead' : 'leads'} deleted` : `${count} ${count === 1 ? 'lead' : 'leads'} updated`);
    load();
  }

  function onDrop(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault();
    if (!draggedId) return;
    changeStatus(draggedId, status);
    setDraggedId(null);
    setDragOver(null);
  }

  let filtered = leads.filter((l) => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (search && !`${l.name} ${l.address || ''} ${l.notes || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (sortBy === 'score') {
    filtered = [...filtered].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
  } else if (sortBy === 'value') {
    filtered = [...filtered].sort((a, b) => b.value - a.value);
  }

  const total = filtered.reduce((s, l) => s + l.value, 0);
  const open = filtered.filter((l) => l.status === 'new' || l.status === 'quoted').length;
  const scoredCount = leads.filter((l) => l.aiScore !== undefined).length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <TopBar
        title="Pipeline"
        subtitle={`${filtered.length} LEADS · ${open} OPEN · $${total.toLocaleString()} TOTAL${scoredCount ? ` · ${scoredCount} SCORED` : ''}`}
        onMenuClick={openSidebar}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={scoreAll}
              disabled={scoring}
              className="px-3 py-1.5 border border-signal/40 bg-signal/10 hover:bg-signal/20 text-signal rounded-md text-xs font-medium disabled:opacity-50">
              {scoring ? 'Scoring...' : '⚡ AI Score All'}
            </button>
            <button onClick={() => setImporting(true)} className="px-3 py-1.5 border border-rule rounded-md text-xs text-paper-mute hover:text-paper hidden md:inline-block">
              ↑ Import CSV
            </button>
            <button onClick={() => setCreating(true)} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
              + New Lead
            </button>
          </div>
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
          <div className="border-l border-rule pl-3 flex gap-1">
            <span className="font-mono text-[10px] text-paper-dim tracking-wider uppercase mr-1">Sort:</span>
            {(['recent', 'score', 'value'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2 py-1 rounded font-mono text-[10px] tracking-wider uppercase ${
                  sortBy === s ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {(['kanban', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded font-mono text-[10px] tracking-wider uppercase ${
                view === v ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
              }`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="bg-signal/10 border-b border-signal/30 px-4 md:px-6 py-2 flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] text-signal tracking-wider uppercase">{selected.size} SELECTED</span>
          <div className="flex gap-1 flex-wrap">
            {(['new', 'quoted', 'booked', 'completed', 'lost'] as const).map((s) => (
              <button
                key={s}
                onClick={() => bulkAction('set-status', { status: s })}
                className="px-2 py-1 rounded font-mono text-[10px] tracking-wider uppercase border border-rule bg-ink hover:bg-paper-dim text-paper-mute hover:text-paper">
                → {s}
              </button>
            ))}
            <button onClick={() => bulkAction('delete')} className="px-2 py-1 rounded font-mono text-[10px] tracking-wider uppercase border border-red-400/30 text-red-400 hover:bg-red-400/10 ml-2">
              Delete
            </button>
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] text-paper-mute hover:text-paper">Clear</button>
        </div>
      )}

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
                    <span className="bg-rule px-1.5 py-0.5 rounded-full font-mono text-[10px] text-paper-mute">{items.length}</span>
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
                        selected={selected.has(lead.id)}
                        onToggleSelect={() => toggleSelect(lead.id)}
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
        <div className="p-4 md:p-6 overflow-x-auto">
          <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-ink-3">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((l) => selected.has(l.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(filtered.map((l) => l.id)));
                        else setSelected(new Set());
                      }}
                      className="accent-signal"
                    />
                  </th>
                  {['Name', 'Score', 'Status', 'Type', 'Value', 'Source', 'Quote', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-[10px] text-paper-mute tracking-wider uppercase font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-rule hover:bg-ink/40">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} className="accent-signal"/>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/leads/${l.id}`} className="text-paper hover:text-signal font-medium">{l.name}</Link>
                    </td>
                    <td className="px-3 py-2.5"><ScoreBadge score={l.aiScore}/></td>
                    <td className="px-3 py-2.5"><StatusPill status={l.status}/></td>
                    <td className="px-3 py-2.5"><TypePill type={l.type}/></td>
                    <td className="px-3 py-2.5 font-mono text-acid">${l.value}</td>
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
      {importing && <ImportModal onClose={() => setImporting(false)} onSaved={load}/>}
    </div>
  );
}

function LeadCard({ lead, selected, onToggleSelect, onDragStart, onDragEnd, dragging }: {
  lead: Lead;
  selected: boolean;
  onToggleSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const borderColor = lead.type === 'lawn' ? 'border-l-acid' : lead.type === 'hvac' ? 'border-l-blue-400' : lead.type === 'plumb' ? 'border-l-signal' : 'border-l-paper-mute';

  return (
    <div className={`relative ${dragging ? 'opacity-30 scale-95' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 accent-signal cursor-pointer z-10"
      />
      <Link
        href={`/leads/${lead.id}`}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={`block bg-ink border border-rule border-l-2 ${borderColor} rounded p-3 pr-7 hover:border-signal/30 transition-all group cursor-pointer`}>
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <div className="text-sm font-medium text-paper truncate">{lead.name}</div>
          <span className="font-mono text-[10px] text-acid font-semibold whitespace-nowrap">${lead.value}</span>
        </div>
        {lead.address && <div className="text-[11px] text-paper-mute truncate mb-2">{lead.address}</div>}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <TypePill type={lead.type} small/>
            {lead.aiScore !== undefined && <ScoreBadge score={lead.aiScore} small/>}
            {lead.quote && (
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-signal/10 text-signal border border-signal/20">
                ⚡ quote
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

function ScoreBadge({ score, small }: { score?: number; small?: boolean }) {
  if (score === undefined) return <span className="font-mono text-[10px] text-paper-dim">—</span>;
  const color = score >= 70 ? 'bg-acid/10 text-acid border-acid/30' : score >= 40 ? 'bg-amber-400/10 text-amber-400 border-amber-400/30' : 'bg-red-400/10 text-red-400 border-red-400/30';
  return (
    <span className={`font-mono uppercase px-1.5 py-0.5 rounded border ${color} ${small ? 'text-[9px]' : 'text-[10px]'}`}>
      {score}
    </span>
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

  // AI price suggestion
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<{ suggested: number; low: number; high: number; reasoning: string } | null>(null);

  async function suggestPrice() {
    if (!notes.trim() && !name.trim()) return;
    setPriceLoading(true);
    const desc = `${type} job for ${name}${address ? ' at ' + address : ''}${notes ? '. ' + notes : ''}`;
    const res = await fetch('/api/ai/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: desc, jobType: type }),
    });
    const data = await res.json();
    setPriceSuggestion({
      suggested: data.suggested,
      low: data.range?.low || 0,
      high: data.range?.high || 0,
      reasoning: data.reasoning,
    });
    if (!value && data.suggested) setValue(String(data.suggested));
    setPriceLoading(false);
  }

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
                    className={`py-1.5 text-[11px] rounded border ${
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

          {/* AI Price Suggest */}
          <div className="border-t border-rule pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-signal tracking-wider uppercase">⚡ AI Price Suggest</span>
              <button
                onClick={suggestPrice}
                disabled={priceLoading || (!name && !notes)}
                className="text-[11px] text-signal hover:text-signal-bright font-medium disabled:opacity-40">
                {priceLoading ? 'Analyzing...' : priceSuggestion ? 'Re-suggest →' : 'Suggest price →'}
              </button>
            </div>
            {priceSuggestion && (
              <div className="bg-ink border border-rule rounded-md p-3 fade-up">
                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <span className="font-mono text-[10px] text-paper-mute uppercase">Suggested</span>
                    <div className="font-serif italic text-2xl text-acid">${priceSuggestion.suggested}</div>
                  </div>
                  <div className="font-mono text-[10px] text-paper-mute">range: ${priceSuggestion.low} – ${priceSuggestion.high}</div>
                </div>
                <div className="text-xs text-paper-mute leading-relaxed">{priceSuggestion.reasoning}</div>
              </div>
            )}
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

function ImportModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [csv, setCsv] = useState('');
  const [type, setType] = useState<'lawn' | 'hvac' | 'plumb' | 'other'>('lawn');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsv(text);
  }

  async function doImport() {
    setImporting(true);
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, defaultType: type }),
    });
    const data = await res.json();
    setResult(data);
    setImporting(false);
    if (data.created > 0) onSaved();
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-ink-2 border border-rule rounded-xl w-full max-w-lg fade-up">
        <div className="px-5 py-3 border-b border-rule flex justify-between items-center">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">Import Leads from CSV</div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-paper-mute leading-relaxed">
            Upload a CSV from Excel, Google Sheets, or another CRM. We'll auto-map columns like name, phone, email, address.
          </p>
          <input type="file" accept=".csv" onChange={handleFile} className="text-xs text-paper-mute file:mr-3 file:px-3 file:py-1.5 file:bg-paper-dim file:text-paper file:border-0 file:rounded-md file:cursor-pointer file:font-medium"/>
          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Default trade for imported leads</label>
            <div className="grid grid-cols-4 gap-1">
              {(['lawn', 'hvac', 'plumb', 'other'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-1.5 text-[11px] rounded border ${
                    type === t ? 'border-signal bg-signal/10 text-signal' : 'border-rule text-paper-mute'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          {csv && (
            <div className="bg-ink border border-rule rounded-md p-3 max-h-32 overflow-y-auto">
              <div className="font-mono text-[10px] text-paper-dim mb-1">Preview ({csv.split('\n').length} lines)</div>
              <pre className="font-mono text-[10px] text-paper-mute whitespace-pre">{csv.split('\n').slice(0, 5).join('\n')}</pre>
            </div>
          )}
          {result && (
            <div className={`rounded-md p-3 ${result.created > 0 ? 'bg-acid/5 border border-acid/30' : 'bg-red-400/5 border border-red-400/30'}`}>
              <div className="text-sm">{result.created} imported · {result.skipped} skipped</div>
              {result.errors?.length > 0 && (
                <div className="font-mono text-[10px] text-red-400 mt-2 space-y-1">
                  {result.errors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-rule flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-paper-mute hover:text-paper">{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button onClick={doImport} disabled={importing || !csv} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-50">
              {importing ? 'Importing...' : 'Import'}
            </button>
          )}
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
