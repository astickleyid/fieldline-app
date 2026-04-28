'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tags?: string[];
  notes?: string;
  totalSpent: number;
  jobCount: number;
  firstSeenAt: number;
  lastJobAt?: number;
  createdAt: number;
};

type Job = {
  id: string;
  customerName: string;
  scheduledFor: number;
  status: string;
  type: string;
  value: number;
  address?: string;
};

type Invoice = {
  id: string;
  amount: number;
  status: string;
  publicToken: string;
  lineItems: { description: string; amount: number }[];
  createdAt: number;
  paidAt?: number;
};

type Activity = { id: string; type: string; message: string; timestamp: number };

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { openSidebar } = useShell();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [tab, setTab] = useState<'jobs' | 'invoices' | 'activity'>('jobs');

  useEffect(() => {
    load();
    const onFocus = () => quietReload();
    const onVis = () => { if (document.visibilityState === 'visible') quietReload(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [customerId]);

  async function load() {
    setLoading(true);
    await fetchData();
    setLoading(false);
  }

  async function quietReload() { await fetchData(); }

  async function fetchData() {
    const res = await fetch(`/api/customers/${customerId}`);
    const data = await res.json();
    setCustomer(data.customer);
    setEditForm(data.customer || {});
    setActivity(data.activity || []);
    setJobs(data.jobs || []);
    setInvoices(data.invoices || []);
  }

  async function save() {
    await fetch(`/api/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditing(false);
    quietReload();
  }

  async function remove() {
    if (!customer) return;
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

  const upcomingJobs = jobs.filter((j) => j.scheduledFor > Date.now() && j.status === 'scheduled').sort((a, b) => a.scheduledFor - b.scheduledFor);
  const pastJobs = jobs.filter((j) => j.scheduledFor <= Date.now() || j.status === 'completed' || j.status === 'cancelled').sort((a, b) => b.scheduledFor - a.scheduledFor);
  const outstandingInvoices = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

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

      <div className="p-4 md:p-6 max-w-5xl space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Lifetime', value: '$' + customer.totalSpent.toLocaleString() },
            { label: 'Jobs', value: customer.jobCount },
            { label: 'Outstanding', value: '$' + outstandingInvoices.toLocaleString(), accent: outstandingInvoices > 0 },
            { label: 'Last Job', value: customer.lastJobAt ? fmtDate(customer.lastJobAt) : '—' },
          ].map((s) => (
            <div key={s.label} className="bg-ink-2 border border-rule rounded-lg p-3">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-1">{s.label}</div>
              <div className={`font-serif italic text-2xl tracking-tight leading-none ${s.accent ? 'text-red-400' : ''}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT — contact + actions */}
          <div className="space-y-4">
            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Contact</div>
              {editing ? (
                <div className="space-y-2">
                  <input className="w-full bg-ink border border-rule rounded px-2 py-1.5 text-sm" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name"/>
                  <input className="w-full bg-ink border border-rule rounded px-2 py-1.5 text-sm" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone"/>
                  <input className="w-full bg-ink border border-rule rounded px-2 py-1.5 text-sm" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email"/>
                  <input className="w-full bg-ink border border-rule rounded px-2 py-1.5 text-sm" value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Address"/>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  {customer.phone ? <a href={`tel:${customer.phone}`} className="block text-signal hover:text-signal-bright">{customer.phone}</a> : <div className="text-paper-dim text-xs">No phone</div>}
                  {customer.email ? <a href={`mailto:${customer.email}`} className="block text-signal hover:text-signal-bright break-all">{customer.email}</a> : <div className="text-paper-dim text-xs">No email</div>}
                  {customer.address ? <div className="text-paper">{customer.address}</div> : <div className="text-paper-dim text-xs">No address</div>}
                </div>
              )}
            </div>

            <div className="bg-ink-2 border border-rule rounded-lg p-4">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Quick Actions</div>
              <div className="grid grid-cols-2 gap-2">
                {customer.phone && <a href={`tel:${customer.phone}`} className="px-3 py-2 border border-rule text-paper hover:bg-rule rounded-md text-xs text-center">📞 Call</a>}
                {customer.phone && <a href={`sms:${customer.phone}`} className="px-3 py-2 border border-rule text-paper hover:bg-rule rounded-md text-xs text-center">💬 Text</a>}
                {customer.email && <a href={`mailto:${customer.email}`} className="px-3 py-2 border border-rule text-paper hover:bg-rule rounded-md text-xs text-center col-span-2">✉ Email</a>}
              </div>
              <button onClick={remove} className="w-full mt-3 px-3 py-2 border border-red-400/30 text-red-400 hover:bg-red-400/10 rounded-md text-xs">Delete customer</button>
            </div>

            {customer.tags && customer.tags.length > 0 && (
              <div className="bg-ink-2 border border-rule rounded-lg p-4">
                <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-2">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((t) => (
                    <span key={t} className="font-mono text-[10px] uppercase px-2 py-1 rounded bg-rule text-paper">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — tabbed history */}
          <div className="lg:col-span-2">
            <div className="bg-ink-2 border border-rule rounded-lg overflow-hidden">
              <div className="border-b border-rule px-2 flex items-center gap-1 overflow-x-auto">
                {([
                  { key: 'jobs', label: 'Jobs', count: jobs.length },
                  { key: 'invoices', label: 'Invoices', count: invoices.length },
                  { key: 'activity', label: 'Activity', count: activity.length },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-3 py-2.5 font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      tab === t.key ? 'text-paper border-b-2 border-signal -mb-px' : 'text-paper-mute hover:text-paper'
                    }`}>
                    {t.label}
                    <span className="font-mono text-[9px] opacity-70">{t.count}</span>
                  </button>
                ))}
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {tab === 'jobs' && (
                  <div>
                    {upcomingJobs.length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-ink-3 font-mono text-[9px] text-acid tracking-wider uppercase">Upcoming</div>
                        {upcomingJobs.map((job) => (
                          <JobItem key={job.id} job={job}/>
                        ))}
                      </>
                    )}
                    {pastJobs.length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-ink-3 font-mono text-[9px] text-paper-mute tracking-wider uppercase">Past</div>
                        {pastJobs.map((job) => (
                          <JobItem key={job.id} job={job}/>
                        ))}
                      </>
                    )}
                    {jobs.length === 0 && <div className="p-8 text-center text-[11px] text-paper-dim italic">No jobs yet</div>}
                  </div>
                )}

                {tab === 'invoices' && (
                  <div>
                    {invoices.length === 0 ? (
                      <div className="p-8 text-center text-[11px] text-paper-dim italic">No invoices yet</div>
                    ) : (
                      invoices.map((inv) => <InvoiceItem key={inv.id} invoice={inv}/>)
                    )}
                  </div>
                )}

                {tab === 'activity' && (
                  <div>
                    {activity.length === 0 ? (
                      <div className="p-8 text-center text-[11px] text-paper-dim italic">No activity yet</div>
                    ) : activity.map((a) => (
                      <div key={a.id} className="px-4 py-3 border-b border-rule last:border-0">
                        <div className="text-xs text-paper">{a.message}</div>
                        <div className="font-mono text-[10px] text-paper-dim mt-1">{fmtDate(a.timestamp)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobItem({ job }: { job: Job }) {
  const c = job.type === 'lawn' ? 'bg-acid/10 text-acid' : job.type === 'hvac' ? 'bg-blue-400/10 text-blue-400' : 'bg-signal/10 text-signal';
  const statusColor = job.status === 'completed' ? 'text-acid' : job.status === 'cancelled' ? 'text-red-400 line-through' : 'text-paper-mute';
  return (
    <div className="px-4 py-3 border-b border-rule last:border-0 hover:bg-ink/40 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-paper">{new Date(job.scheduledFor).toLocaleDateString()} · {new Date(job.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
        {job.address && <div className="text-[11px] text-paper-mute truncate">{job.address}</div>}
      </div>
      <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded ${c}`}>{job.type}</span>
      <span className={`font-mono text-[10px] uppercase ${statusColor}`}>{job.status}</span>
      <span className="font-mono text-sm text-paper w-16 text-right">${job.value}</span>
    </div>
  );
}

function InvoiceItem({ invoice }: { invoice: Invoice }) {
  const statusColors: Record<string, string> = {
    draft: 'bg-paper-dim text-paper-mute',
    sent: 'bg-blue-400/10 text-blue-400',
    paid: 'bg-acid/10 text-acid',
    overdue: 'bg-red-400/10 text-red-400',
    void: 'bg-rule text-paper-dim',
  };
  return (
    <Link href="/invoices" className="block px-4 py-3 border-b border-rule last:border-0 hover:bg-ink/40 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-paper">INV-{invoice.id.slice(-6).toUpperCase()}</div>
        <div className="text-[11px] text-paper-mute">{new Date(invoice.createdAt).toLocaleDateString()}</div>
      </div>
      <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded ${statusColors[invoice.status]}`}>{invoice.status}</span>
      <span className="font-mono text-sm text-paper w-20 text-right">${invoice.amount.toLocaleString()}</span>
    </Link>
  );
}
