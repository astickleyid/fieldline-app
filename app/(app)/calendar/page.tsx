'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Job = {
  id: string;
  customerName: string;
  scheduledFor: number;
  durationMinutes: number;
  status: string;
  type: string;
  address?: string;
  value: number;
  recurring?: 'weekly' | 'biweekly' | 'monthly' | null;
  notes?: string;
};

export default function CalendarPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editing, setEditing] = useState<Job | null>(null);
  const { openSidebar } = useShell();

  useEffect(() => { load(); }, []);
  async function load() {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    setJobs(data.jobs || []);
    setLoading(false);
  }

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const weekTotal = jobs
    .filter((j) => {
      const d = new Date(j.scheduledFor);
      return d >= weekStart && d < new Date(weekStart.getTime() + 7 * 86400000);
    })
    .reduce((s, j) => s + j.value, 0);

  return (
    <div>
      <TopBar
        title="Schedule"
        subtitle={`WEEK OF ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()} · $${weekTotal.toLocaleString()} BOOKED`}
        onMenuClick={openSidebar}
        action={
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset(weekOffset - 1)} className="px-2.5 py-1.5 text-xs border border-rule rounded-md text-paper-mute hover:text-paper">←</button>
            <button onClick={() => setWeekOffset(0)} className="px-2.5 py-1.5 text-xs border border-rule rounded-md text-paper-mute hover:text-paper">Today</button>
            <button onClick={() => setWeekOffset(weekOffset + 1)} className="px-2.5 py-1.5 text-xs border border-rule rounded-md text-paper-mute hover:text-paper">→</button>
          </div>
        }
      />

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {days.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayJobs = jobs
              .filter((j) => new Date(j.scheduledFor).toDateString() === day.toDateString())
              .sort((a, b) => a.scheduledFor - b.scheduledFor);
            const dayTotal = dayJobs.reduce((s, j) => s + j.value, 0);

            return (
              <div key={day.toDateString()} className={`bg-ink-2 border rounded-lg overflow-hidden ${isToday ? 'border-signal/40' : 'border-rule'}`}>
                <div className={`px-2 py-2 border-b ${isToday ? 'bg-signal/10 border-signal/30' : 'bg-ink-3 border-rule'}`}>
                  <div className={`font-mono text-[9px] tracking-wider uppercase ${isToday ? 'text-signal' : 'text-paper-mute'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-base md:text-lg font-serif italic">{day.getDate()}</div>
                    {dayTotal > 0 && <div className="font-mono text-[9px] text-paper-dim">${dayTotal}</div>}
                  </div>
                </div>
                <div className="p-1.5 space-y-1 min-h-[280px]">
                  {dayJobs.length === 0 && <div className="text-[10px] text-paper-dim italic text-center py-4">—</div>}
                  {dayJobs.map((job) => {
                    const time = new Date(job.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    return (
                      <button
                        key={job.id}
                        onClick={() => setEditing(job)}
                        className={`w-full text-left bg-ink border-l-2 rounded p-1.5 ${
                          job.type === 'lawn' ? 'border-l-acid' : job.type === 'hvac' ? 'border-l-blue-400' : 'border-l-signal'
                        } border border-rule hover:border-signal/30 transition-all`}>
                        <div className="font-mono text-[8px] md:text-[9px] text-paper-mute mb-0.5">{time}</div>
                        <div className="text-[10px] md:text-[11px] text-paper font-medium truncate">{job.customerName}</div>
                        <div className="font-mono text-[8px] md:text-[9px] text-paper-dim">${job.value}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {jobs.length === 0 && !loading && (
          <div className="text-center mt-12 py-8 border border-dashed border-rule rounded-lg">
            <div className="text-paper-mute mb-1">No jobs scheduled</div>
            <div className="text-xs text-paper-dim">Book a lead from the Pipeline page to schedule jobs.</div>
          </div>
        )}
      </div>

      {editing && <JobModal job={editing} onClose={() => setEditing(null)} onSaved={load}/>}
    </div>
  );
}

function JobModal({ job, onClose, onSaved }: { job: Job; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(job.status);
  const [notes, setNotes] = useState(job.notes || '');
  const [recurring, setRecurring] = useState<Job['recurring']>(job.recurring || null);
  const [saving, setSaving] = useState(false);
  const [generatingRecurring, setGeneratingRecurring] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, recurring }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  async function genRecurring() {
    if (!recurring) return;
    setGeneratingRecurring(true);
    // First save the recurring setting, then generate
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recurring }),
    });
    await fetch(`/api/jobs/${job.id}/recurring`, { method: 'POST' });
    setGeneratingRecurring(false);
    onSaved();
    onClose();
  }

  async function remove() {
    if (!confirm('Delete this job?')) return;
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-ink-2 border border-rule rounded-xl w-full max-w-md fade-up">
        <div className="px-5 py-3 border-b border-rule flex justify-between items-center">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">Job · {job.id.slice(-6).toUpperCase()}</div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl">×</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <div className="text-base font-medium text-paper">{job.customerName}</div>
            <div className="text-xs text-paper-mute">{new Date(job.scheduledFor).toLocaleString()} · {job.durationMinutes}min · ${job.value}</div>
            {job.address && <div className="text-xs text-paper-mute">{job.address}</div>}
          </div>

          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm">
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Recurring</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { v: null, l: 'None' },
                { v: 'weekly', l: 'Weekly' },
                { v: 'biweekly', l: 'Biweekly' },
                { v: 'monthly', l: 'Monthly' },
              ].map((opt) => (
                <button
                  key={opt.l}
                  type="button"
                  onClick={() => setRecurring(opt.v as Job['recurring'])}
                  className={`py-1.5 text-[11px] rounded border ${
                    recurring === opt.v ? 'border-signal bg-signal/10 text-signal' : 'border-rule text-paper-mute hover:text-paper'
                  }`}>
                  {opt.l}
                </button>
              ))}
            </div>
            {recurring && !job.recurring && (
              <button onClick={genRecurring} disabled={generatingRecurring} className="w-full mt-2 py-1.5 bg-acid/10 hover:bg-acid/20 border border-acid/30 text-acid rounded-md text-xs font-medium">
                {generatingRecurring ? 'Generating...' : `Generate next 4 ${recurring} jobs →`}
              </button>
            )}
          </div>

          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm resize-none"/>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-rule flex justify-between items-center">
          <button onClick={remove} className="text-[11px] text-red-400 hover:text-red-300 font-mono tracking-wide">Delete</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-paper-mute hover:text-paper">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-50">
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
