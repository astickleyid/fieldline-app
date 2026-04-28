'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Rule = {
  id: string;
  name: string;
  trigger: 'lead-status-changed' | 'job-completed' | 'invoice-overdue' | 'lead-stale';
  conditions: { from?: string; to?: string; daysIdle?: number };
  action: 'create-task' | 'send-notification' | 'auto-invoice' | 'add-tag';
  actionConfig: Record<string, any>;
  enabled: boolean;
  lastRunAt?: number;
  runCount: number;
  createdAt: number;
};

const TRIGGER_LABELS: Record<string, string> = {
  'lead-status-changed': 'When a lead\'s status changes',
  'job-completed': 'When a job is completed',
  'invoice-overdue': 'When an invoice goes overdue',
  'lead-stale': 'When a lead has been idle',
};

const ACTION_LABELS: Record<string, string> = {
  'create-task': 'Create a task',
  'send-notification': 'Send myself a notification',
  'auto-invoice': 'Auto-create an invoice',
  'add-tag': 'Add a tag',
};

const PRESETS = [
  {
    name: 'Follow up on stale leads',
    trigger: 'lead-stale' as const,
    conditions: { daysIdle: 3 },
    action: 'create-task' as const,
    actionConfig: { title: 'Follow up with this lead', priority: 'high' },
    enabled: true,
  },
  {
    name: 'Auto-invoice on job complete',
    trigger: 'job-completed' as const,
    conditions: {},
    action: 'auto-invoice' as const,
    actionConfig: {},
    enabled: false,
  },
  {
    name: 'Notify me on quote acceptance',
    trigger: 'lead-status-changed' as const,
    conditions: { to: 'booked' },
    action: 'send-notification' as const,
    actionConfig: { title: 'Quote accepted!', message: 'A customer just accepted a quote.' },
    enabled: true,
  },
];

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { openSidebar } = useShell();

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
    const res = await fetch('/api/automations');
    const data = await res.json();
    setRules(data.rules || []);
    setLoading(false);
  }

  async function toggle(id: string, enabled: boolean) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
  }

  async function remove(id: string) {
    if (!confirm('Delete this automation?')) return;
    await fetch(`/api/automations/${id}`, { method: 'DELETE' });
    load();
  }

  async function seedPresets() {
    if (!confirm('Add 3 starter automations? You can edit or disable them.')) return;
    for (const p of PRESETS) {
      await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
    }
    load();
  }

  return (
    <div>
      <TopBar
        title="Automations"
        subtitle={`${rules.filter(r => r.enabled).length} ACTIVE · ${rules.length} TOTAL`}
        onMenuClick={openSidebar}
        action={
          <div className="flex gap-2">
            {rules.length === 0 && (
              <button onClick={seedPresets} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
                Add starters
              </button>
            )}
            <button onClick={() => setCreating(true)} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">+ New</button>
          </div>
        }
      />

      <div className="p-4 md:p-6 max-w-3xl">
        <div className="mb-4 bg-signal/5 border border-signal/30 rounded-lg p-4">
          <div className="font-mono text-[10px] text-signal tracking-wider uppercase mb-1">⚡ How automations work</div>
          <div className="text-xs text-paper-mute leading-relaxed">
            Set up rules that fire automatically when something happens — a lead changing status, a job finishing, an invoice going overdue.
            They handle the busywork so nothing slips through.
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-paper-mute font-mono text-xs">Loading...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 bg-ink-2 border border-dashed border-rule rounded-lg">
            <div className="text-paper-mute mb-2">No automations yet</div>
            <div className="text-xs text-paper-dim mb-4">Most teams have at least 3-5 rules running constantly. Start with the basics.</div>
            <button onClick={seedPresets} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
              + Add 3 starter automations
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className={`bg-ink-2 border rounded-lg p-4 ${r.enabled ? 'border-rule' : 'border-rule opacity-60'}`}>
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-medium text-paper">{r.name}</div>
                    <div className="text-[11px] text-paper-mute mt-0.5">
                      {TRIGGER_LABELS[r.trigger]}{r.conditions?.daysIdle ? ` (${r.conditions.daysIdle}+ days)` : ''}{r.conditions?.to ? ` → ${r.conditions.to}` : ''}
                      {' '}<span className="text-paper-dim">→</span> {ACTION_LABELS[r.action]}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle checked={r.enabled} onChange={(v) => toggle(r.id, v)}/>
                    <button onClick={() => remove(r.id)} className="text-paper-dim hover:text-red-400 text-sm">×</button>
                  </div>
                </div>
                {r.runCount > 0 && (
                  <div className="font-mono text-[10px] text-paper-dim border-t border-rule pt-2">
                    Run {r.runCount}× · Last: {r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : '—'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {creating && <NewRuleModal onClose={() => setCreating(false)} onSaved={load}/>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-acid' : 'bg-rule'}`}>
      <span className={`absolute top-0.5 ${checked ? 'left-[18px]' : 'left-0.5'} w-4 h-4 bg-paper rounded-full transition-all`}/>
    </button>
  );
}

function NewRuleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<Rule['trigger']>('lead-stale');
  const [daysIdle, setDaysIdle] = useState('3');
  const [statusTo, setStatusTo] = useState('booked');
  const [action, setAction] = useState<Rule['action']>('create-task');
  const [actionTitle, setActionTitle] = useState('Follow up');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const conditions: any = {};
    if (trigger === 'lead-stale') conditions.daysIdle = Number(daysIdle);
    if (trigger === 'lead-status-changed') conditions.to = statusTo;

    const actionConfig: any = {};
    if (action === 'create-task') actionConfig.title = actionTitle;
    if (action === 'send-notification') { actionConfig.title = actionTitle; actionConfig.message = actionTitle; }

    await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, trigger, conditions, action, actionConfig, enabled: true }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-ink-2 border border-rule rounded-xl w-full max-w-lg my-8 fade-up">
        <div className="px-5 py-3 border-b border-rule flex justify-between items-center">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">New Automation</div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Automation name" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>

          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">When this happens</label>
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as Rule['trigger'])} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm">
              {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {trigger === 'lead-stale' && (
            <div>
              <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Days idle</label>
              <input type="number" value={daysIdle} onChange={(e) => setDaysIdle(e.target.value)} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm"/>
            </div>
          )}
          {trigger === 'lead-status-changed' && (
            <div>
              <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Status changed to</label>
              <select value={statusTo} onChange={(e) => setStatusTo(e.target.value)} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm">
                <option value="quoted">Quoted</option>
                <option value="booked">Booked</option>
                <option value="completed">Completed</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          )}

          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Then do this</label>
            <select value={action} onChange={(e) => setAction(e.target.value as Rule['action'])} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm">
              {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {(action === 'create-task' || action === 'send-notification') && (
            <input value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} placeholder={action === 'create-task' ? 'Task title' : 'Notification message'} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          )}
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
