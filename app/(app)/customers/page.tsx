'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tags?: string[];
  totalSpent: number;
  jobCount: number;
  lastJobAt?: number;
  createdAt: number;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [sort, setSort] = useState<'recent' | 'spent' | 'name'>('recent');
  const { openSidebar } = useShell();

  useEffect(() => { load(); }, []);
  async function load() {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(data.customers || []);
    setLoading(false);
  }

  const filtered = customers.filter((c) =>
    !search || `${c.name} ${c.address || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sort === 'spent') return b.totalSpent - a.totalSpent;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return (b.lastJobAt || b.createdAt) - (a.lastJobAt || a.createdAt);
  });

  const totalLifetime = customers.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <div>
      <TopBar
        title="Customers"
        subtitle={`${customers.length} TOTAL · $${totalLifetime.toLocaleString()} LIFETIME`}
        onMenuClick={openSidebar}
        action={
          <button onClick={() => setCreating(true)} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
            + New Customer
          </button>
        }
      />

      <div className="border-b border-rule px-4 md:px-6 h-12 flex items-center gap-3 bg-ink/40">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter customers..."
          className="bg-ink-2 border border-rule rounded-md px-3 py-1.5 text-xs text-paper placeholder-paper-dim outline-none focus:border-signal/40 w-48"
        />
        <div className="flex gap-1 ml-auto">
          {(['recent', 'spent', 'name'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-2.5 py-1 rounded font-mono text-[10px] tracking-wider uppercase ${
                sort === s ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="text-center py-12 text-paper-mute font-mono text-xs">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-ink-2 border border-dashed border-rule rounded-lg">
            <div className="text-paper-mute mb-2">No customers yet</div>
            <div className="text-xs text-paper-dim">Customers are created automatically when you complete a job for a lead, or click "New Customer" above.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="bg-ink-2 border border-rule rounded-lg p-4 hover:border-signal/30 transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <div className="text-base font-medium text-paper truncate">{c.name}</div>
                    {c.address && <div className="text-[11px] text-paper-mute truncate mt-0.5">{c.address}</div>}
                  </div>
                  <span className="text-paper-dim group-hover:text-signal text-xs">→</span>
                </div>
                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.tags.map((t) => (
                      <span key={t} className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-rule text-paper-mute">{t}</span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-rule">
                  <div>
                    <div className="font-mono text-[9px] text-paper-mute uppercase tracking-wider">Lifetime</div>
                    <div className="font-serif italic text-lg text-acid">${c.totalSpent.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-paper-mute uppercase tracking-wider">Jobs</div>
                    <div className="font-serif italic text-lg text-paper">{c.jobCount}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {creating && <NewCustomerModal onClose={() => setCreating(false)} onSaved={load}/>}
    </div>
  );
}

function NewCustomerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, email, address,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-ink-2 border border-rule rounded-xl w-full max-w-md fade-up">
        <div className="px-5 py-3 border-b border-rule flex justify-between items-center">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">New Customer</div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl">×</button>
        </div>
        <div className="p-5 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name *" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
        </div>
        <div className="px-5 py-3 border-t border-rule flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-paper-mute hover:text-paper">Cancel</button>
          <button onClick={save} disabled={saving || !name} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-50">
            {saving ? '...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
