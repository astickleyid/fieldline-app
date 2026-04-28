'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { openSidebar } = useShell();

  const [customer, setCustomer] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => { load(); }, [customerId]);

  async function load() {
    const res = await fetch(`/api/customers/${customerId}`);
    const data = await res.json();
    setCustomer(data.customer);
    setEditForm(data.customer || {});
    setActivity(data.activity || []);
    setLoading(false);
  }

  async function save() {
    await fetch(`/api/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditing(false);
    load();
  }

  async function remove() {
    if (!confirm(`Delete ${customer.name}? This won't delete their leads or jobs.`)) return;
    await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
    router.push('/customers');
  }

  const fmtDate = (t: number) => {
    const d = Date.now() - t;
    if (d < 86_400_000) return Math.floor(d / 3_600_000) + 'h ago';
    if (d < 86_400_000 * 7) return Math.floor(d / 86_400_000) + 'd ago';
    return new Date(t).toLocaleDateString();
  };

  if (loading) return <div className="p-8 text-center text-paper-mute font-mono text-xs">Loading...</div>;
  if (!customer) return (
    <div className="p-8 text-center">
      <div className="text-paper-mute mb-4">Customer not found</div>
      <Link href="/customers" className="text-signal text-sm">← Back</Link>
    </div>
  );

  return (
    <div>
      <TopBar
        title={customer.name}
        subtitle={`${customer.jobCount} JOBS · $${customer.totalSpent.toLocaleString()} LIFETIME · SINCE ${new Date(customer.firstSeenAt).toLocaleDateString()}`}
        onMenuClick={openSidebar}
        action={
          <div className="flex items-center gap-2">
            <Link href="/customers" className="px-3 py-1.5 border border-rule rounded-md text-xs text-paper-mute hover:text-paper hidden sm:inline-block">← Back</Link>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-paper-dim hover:bg-rule text-paper rounded-md text-xs font-medium">Edit</button>
            ) : (
              <button onClick={save} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">Save</button>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Contact</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {editing ? (
                  <>
                    <input className="bg-ink border border-rule rounded px-2 py-1 text-sm" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name"/>
                    <input className="bg-ink border border-rule rounded px-2 py-1 text-sm" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone"/>
                    <input className="bg-ink border border-rule rounded px-2 py-1 text-sm" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email"/>
                    <input className="bg-ink border border-rule rounded px-2 py-1 text-sm" value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Address"/>
                  </>
                ) : (
                  <>
                    <Detail label="Phone" value={customer.phone ? <a href={`tel:${customer.phone}`} className="text-signal">{customer.phone}</a> : '—'}/>
                    <Detail label="Email" value={customer.email ? <a href={`mailto:${customer.email}`} className="text-signal">{customer.email}</a> : '—'}/>
                    <Detail label="Address" value={customer.address || '—'} colSpan={2}/>
                  </>
                )}
              </div>
            </div>

            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Quick Actions</div>
              <div className="flex flex-wrap gap-2">
                {customer.phone && <a href={`tel:${customer.phone}`} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">Call</a>}
                {customer.phone && <a href={`sms:${customer.phone}`} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">Text</a>}
                {customer.email && <a href={`mailto:${customer.email}`} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">Email</a>}
                <button onClick={remove} className="px-3 py-1.5 border border-red-400/30 text-red-400 hover:bg-red-400/10 rounded-md text-xs ml-auto">Delete</button>
              </div>
            </div>

            {customer.tags && customer.tags.length > 0 && (
              <div className="bg-ink-2 border border-rule rounded-lg p-4">
                <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((t: string) => (
                    <span key={t} className="font-mono text-[10px] uppercase px-2 py-1 rounded bg-rule text-paper">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-rule font-mono text-[10px] text-paper-mute tracking-wider uppercase">
                Activity
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {activity.length === 0 ? (
                  <div className="p-6 text-center text-[11px] text-paper-dim italic">No activity yet</div>
                ) : (
                  activity.map((a) => (
                    <div key={a.id} className="px-4 py-3 border-b border-rule last:border-0">
                      <div className="text-xs text-paper">{a.message}</div>
                      <div className="font-mono text-[10px] text-paper-dim mt-1">{fmtDate(a.timestamp)}</div>
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

function Detail({ label, value, colSpan = 1 }: { label: string; value: React.ReactNode; colSpan?: number }) {
  return (
    <div className={colSpan === 2 ? 'sm:col-span-2' : ''}>
      <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-0.5">{label}</div>
      <div className="text-sm text-paper">{value}</div>
    </div>
  );
}
