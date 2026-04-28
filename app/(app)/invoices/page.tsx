'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Invoice = {
  id: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  lineItems: { description: string; amount: number }[];
  publicToken: string;
  sentAt?: number;
  paidAt?: number;
  dueDate?: number;
  createdAt: number;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
  const [creating, setCreating] = useState(false);
  const params = useSearchParams();
  const highlight = params.get('highlight');
  const { openSidebar } = useShell();

  useEffect(() => { load(); }, []);
  async function load() {
    const res = await fetch('/api/invoices');
    const data = await res.json();
    setInvoices(data.invoices || []);
    setLoading(false);
  }

  async function changeStatus(id: string, status: Invoice['status']) {
    await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        ...(status === 'sent' ? { sentAt: Date.now() } : {}),
        ...(status === 'paid' ? { paidAt: Date.now() } : {}),
      }),
    });
    load();
  }

  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);
  const totals = {
    outstanding: invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0),
    paid: invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0),
    draft: invoices.filter((i) => i.status === 'draft').reduce((s, i) => s + i.amount, 0),
  };

  return (
    <div>
      <TopBar
        title="Invoices"
        subtitle={`${invoices.length} TOTAL · $${totals.outstanding.toLocaleString()} OUTSTANDING · $${totals.paid.toLocaleString()} COLLECTED`}
        onMenuClick={openSidebar}
        action={
          <button onClick={() => setCreating(true)} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
            + New Invoice
          </button>
        }
      />

      <div className="border-b border-rule px-4 md:px-6 h-12 flex items-center gap-1 bg-ink/40 overflow-x-auto">
        {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((f) => {
          const count = f === 'all' ? invoices.length : invoices.filter((i) => i.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                filter === f ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper hover:bg-rule'
              }`}>
              {f}
              <span className="font-mono text-[9px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="text-center py-12 text-paper-mute font-mono text-xs">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-ink-2 border border-dashed border-rule rounded-lg">
            <div className="text-paper-mute mb-2">No invoices yet</div>
            <div className="text-xs text-paper-dim">Create an invoice from a lead's detail page or click "New Invoice".</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} highlight={inv.id === highlight} onChangeStatus={changeStatus}/>
            ))}
          </div>
        )}
      </div>

      {creating && <NewInvoiceModal onClose={() => setCreating(false)} onSaved={load}/>}
    </div>
  );
}

function InvoiceRow({ invoice, highlight, onChangeStatus }: { invoice: Invoice; highlight: boolean; onChangeStatus: (id: string, s: Invoice['status']) => void }) {
  const [open, setOpen] = useState(highlight);

  const statusColors = {
    draft: 'bg-paper-dim text-paper-mute',
    sent: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
    paid: 'bg-acid/10 text-acid border-acid/30',
    overdue: 'bg-red-400/10 text-red-400 border-red-400/30',
    void: 'bg-rule text-paper-dim',
  };

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/invoice/${invoice.publicToken}` : '';

  return (
    <div className={`bg-ink-2 border rounded-lg overflow-hidden transition-all ${highlight ? 'border-signal/50' : 'border-rule'}`}>
      <button onClick={() => setOpen(!open)} className="w-full p-4 hover:bg-ink/40 flex items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-paper font-medium truncate">{invoice.customerName}</div>
            <div className="font-mono text-[10px] text-paper-dim truncate">
              INV-{invoice.id.slice(-6).toUpperCase()} · {new Date(invoice.createdAt).toLocaleDateString()}
            </div>
          </div>
          <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${statusColors[invoice.status]}`}>
            {invoice.status}
          </span>
          <div className="font-serif italic text-xl text-acid whitespace-nowrap">${invoice.amount.toLocaleString()}</div>
          <span className="text-paper-dim text-xs">{open ? '▴' : '▾'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-rule p-4 bg-ink/40 fade-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-2">Line Items</div>
              <div className="space-y-1">
                {invoice.lineItems.map((li, i) => (
                  <div key={i} className="flex justify-between text-sm border-b border-rule pb-1">
                    <span className="text-paper">{li.description}</span>
                    <span className="font-mono text-paper-mute">${li.amount}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-medium">
                  <span>Total</span>
                  <span className="font-mono text-acid">${invoice.amount}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-2">Customer Link</div>
              <div className="bg-ink border border-rule rounded p-2 mb-3">
                <div className="font-mono text-[10px] text-paper truncate">{publicUrl}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                  className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
                  Copy Link
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener"
                  className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
                  Preview
                </a>
                {invoice.customerEmail && (
                  <a
                    href={`mailto:${invoice.customerEmail}?subject=Invoice%20from%20Fieldline&body=${encodeURIComponent('Your invoice: ' + publicUrl)}`}
                    className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
                    Email
                  </a>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-rule">
                <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-2">Status Actions</div>
                <div className="flex flex-wrap gap-1">
                  {(['draft', 'sent', 'paid', 'overdue', 'void'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => onChangeStatus(invoice.id, s)}
                      disabled={s === invoice.status}
                      className={`px-2.5 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all ${
                        s === invoice.status ? 'bg-paper text-ink cursor-default' : 'border border-rule text-paper-mute hover:text-paper'
                      }`}>
                      Mark {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewInvoiceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        customerEmail,
        amount: Number(amount),
        description,
        status: 'draft',
        lineItems: [{ description, amount: Number(amount) }],
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
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">New Invoice</div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl">×</button>
        </div>
        <div className="p-5 space-y-3">
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name *" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Customer email" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (e.g. Lawn services — June)" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount *" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
        </div>
        <div className="px-5 py-3 border-t border-rule flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-paper-mute hover:text-paper">Cancel</button>
          <button onClick={save} disabled={saving || !customerName || !amount} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-50">
            {saving ? '...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
