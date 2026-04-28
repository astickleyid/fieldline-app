'use client';

import { useEffect, useState } from 'react';

type Job = {
  id: string;
  customerName: string;
  scheduledFor: number;
  durationMinutes: number;
  status: string;
  type: string;
  address?: string;
  value: number;
};

export default function CalendarPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetch('/api/jobs').then((r) => r.json()).then((d) => {
      setJobs(d.jobs || []);
      setLoading(false);
    });
  }, []);

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div>
      <div className="border-b border-rule px-6 h-14 flex items-center justify-between sticky top-0 bg-ink/80 backdrop-blur-md z-30">
        <div>
          <h1 className="text-base font-medium">Schedule</h1>
          <div className="font-mono text-[10px] text-paper-dim tracking-wider mt-0.5">
            WEEK OF {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="px-3 py-1.5 text-xs border border-rule rounded-md text-paper-mute hover:text-paper hover:border-paper-dim">←</button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-xs border border-rule rounded-md text-paper-mute hover:text-paper hover:border-paper-dim">Today</button>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="px-3 py-1.5 text-xs border border-rule rounded-md text-paper-mute hover:text-paper hover:border-paper-dim">→</button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayJobs = jobs
              .filter((j) => {
                const d = new Date(j.scheduledFor);
                return d.toDateString() === day.toDateString();
              })
              .sort((a, b) => a.scheduledFor - b.scheduledFor);

            return (
              <div key={day.toDateString()} className={`bg-ink-2 border rounded-lg overflow-hidden ${isToday ? 'border-signal/40' : 'border-rule'}`}>
                <div className={`px-3 py-2 border-b ${isToday ? 'bg-signal/10 border-signal/30' : 'bg-ink-3 border-rule'}`}>
                  <div className={`font-mono text-[10px] tracking-wider uppercase ${isToday ? 'text-signal' : 'text-paper-mute'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-serif italic">{day.getDate()}</div>
                </div>
                <div className="p-2 space-y-1.5 min-h-[300px]">
                  {dayJobs.length === 0 && <div className="text-[11px] text-paper-dim italic text-center py-6">empty</div>}
                  {dayJobs.map((job) => {
                    const time = new Date(job.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    return (
                      <div key={job.id} className={`bg-ink border-l-2 rounded p-2 ${
                        job.type === 'lawn' ? 'border-l-acid' : job.type === 'hvac' ? 'border-l-blue-400' : 'border-l-signal'
                      } border border-rule`}>
                        <div className="font-mono text-[9px] text-paper-mute mb-0.5">{time}</div>
                        <div className="text-[11px] text-paper font-medium truncate">{job.customerName}</div>
                        <div className="font-mono text-[9px] text-paper-dim">${job.value} · {job.type.toUpperCase()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {jobs.length === 0 && !loading && (
          <div className="text-center mt-12 py-8 border border-dashed border-rule rounded-lg">
            <div className="text-paper-mute mb-1">No jobs scheduled yet</div>
            <div className="text-xs text-paper-dim">Move leads to "Booked" status to schedule jobs here</div>
          </div>
        )}
      </div>
    </div>
  );
}
