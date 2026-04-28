'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Task = {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
  dueAt?: number;
  priority: 'low' | 'normal' | 'high';
  leadId?: string;
  customerId?: string;
  jobId?: string;
  createdAt: number;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'today' | 'overdue' | 'done' | 'all'>('open');
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
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data.tasks || []);
    setLoading(false);
  }

  async function toggle(id: string, done: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    });
  }

  async function remove(id: string) {
    if (!confirm('Delete this task?')) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  }

  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

  const filtered = tasks.filter((t) => {
    if (filter === 'open') return !t.done;
    if (filter === 'done') return t.done;
    if (filter === 'today') return !t.done && t.dueAt && t.dueAt >= startOfToday.getTime() && t.dueAt <= endOfToday.getTime();
    if (filter === 'overdue') return !t.done && t.dueAt && t.dueAt < startOfToday.getTime();
    return true;
  }).sort((a, b) => {
    // Open first, then by due date, then priority
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueAt && b.dueAt) return a.dueAt - b.dueAt;
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    const pri = { high: 0, normal: 1, low: 2 };
    return pri[a.priority] - pri[b.priority];
  });

  const stats = {
    open: tasks.filter((t) => !t.done).length,
    today: tasks.filter((t) => !t.done && t.dueAt && t.dueAt >= startOfToday.getTime() && t.dueAt <= endOfToday.getTime()).length,
    overdue: tasks.filter((t) => !t.done && t.dueAt && t.dueAt < startOfToday.getTime()).length,
    done: tasks.filter((t) => t.done).length,
    all: tasks.length,
  };

  return (
    <div>
      <TopBar
        title="Tasks"
        subtitle={`${stats.open} OPEN · ${stats.today} TODAY · ${stats.overdue} OVERDUE`}
        onMenuClick={openSidebar}
        action={
          <button onClick={() => setCreating(true)} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">+ New Task</button>
        }
      />

      <div className="border-b border-rule px-4 md:px-6 h-12 flex items-center gap-1 bg-ink/40 overflow-x-auto">
        {(['open', 'today', 'overdue', 'done', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filter === f ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper hover:bg-rule'
            }`}>
            {f}
            <span className="font-mono text-[9px] opacity-70">{stats[f]}</span>
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6 max-w-3xl">
        {loading ? (
          <div className="text-center py-12 text-paper-mute font-mono text-xs">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-ink-2 border border-dashed border-rule rounded-lg">
            <div className="text-paper-mute mb-2">No {filter} tasks</div>
            <div className="text-xs text-paper-dim">Tasks help you remember follow-ups, callbacks, and to-dos linked to leads or jobs.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={remove}/>)}
          </div>
        )}
      </div>

      {creating && <NewTaskModal onClose={() => setCreating(false)} onSaved={load}/>}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  const overdue = !task.done && task.dueAt && task.dueAt < Date.now() - 86400000;
  const dueToday = task.dueAt && new Date(task.dueAt).toDateString() === new Date().toDateString();

  const pri = {
    high: 'border-l-red-400',
    normal: 'border-l-paper-dim',
    low: 'border-l-paper-mute opacity-70',
  };

  return (
    <div className={`bg-ink-2 border border-rule border-l-2 ${pri[task.priority]} rounded-lg p-3 flex items-start gap-3 ${task.done ? 'opacity-60' : ''}`}>
      <button onClick={() => onToggle(task.id, !task.done)} className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all ${
        task.done ? 'bg-acid border-acid' : 'border-paper-dim hover:border-acid'
      }`}>
        {task.done && <span className="text-ink text-xs font-bold">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${task.done ? 'line-through text-paper-mute' : 'text-paper'}`}>{task.title}</div>
        {task.notes && <div className="text-[11px] text-paper-mute mt-1">{task.notes}</div>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {task.dueAt && (
            <span className={`font-mono text-[10px] ${overdue ? 'text-red-400' : dueToday ? 'text-acid' : 'text-paper-dim'}`}>
              {overdue ? '⚠ ' : ''}{new Date(task.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {dueToday && ' · TODAY'}
            </span>
          )}
          {task.priority === 'high' && <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">High</span>}
          {task.leadId && <Link href={`/leads/${task.leadId}`} className="font-mono text-[10px] text-signal hover:text-signal-bright">→ Lead</Link>}
          {task.customerId && <Link href={`/customers/${task.customerId}`} className="font-mono text-[10px] text-signal hover:text-signal-bright">→ Customer</Link>}
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} className="text-paper-dim hover:text-red-400 text-sm shrink-0">×</button>
    </div>
  );
}

function NewTaskModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, notes, priority,
        dueAt: dueAt ? new Date(dueAt).getTime() : undefined,
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
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">New Task</div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl">×</button>
        </div>
        <div className="p-5 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title *" autoFocus className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40 resize-none"/>
          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Priority</label>
            <div className="grid grid-cols-3 gap-1">
              {(['low', 'normal', 'high'] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPriority(p)} className={`py-1.5 text-[11px] uppercase rounded border ${
                  priority === p ? (p === 'high' ? 'border-red-400 bg-red-400/10 text-red-400' : 'border-signal bg-signal/10 text-signal') : 'border-rule text-paper-mute'
                }`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Due Date (optional)</label>
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm outline-none"/>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-rule flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-paper-mute hover:text-paper">Cancel</button>
          <button onClick={save} disabled={saving || !title} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-50">
            {saving ? '...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
