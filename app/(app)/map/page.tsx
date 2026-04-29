'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
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
  lat?: number;
  lon?: number;
};

export default function MapPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('week');
  const [geocoding, setGeocoding] = useState(false);
  const [selected, setSelected] = useState<Job | null>(null);
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
    const res = await fetch('/api/jobs');
    const data = await res.json();
    let raw = data.jobs || [];

    // Show jobs immediately with cached lat/lon
    const cached = raw.map((j: Job) => j.lat && j.lon ? j : j);
    setJobs(cached);
    setLoading(false);

    // Geocode any missing coords in background and persist them
    const needsGeocode = raw.filter((j: Job) => !j.lat && !j.lon && j.address);
    if (needsGeocode.length === 0) return;

    setGeocoding(true);
    for (const j of needsGeocode) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(j.address!)}`);
        const arr = await res.json();
        if (arr[0]) {
          const lat = parseFloat(arr[0].lat);
          const lon = parseFloat(arr[0].lon);
          // Persist back so we don't re-geocode every load
          fetch(`/api/jobs/${j.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lon }),
          }).catch(() => {});
          // Update local state
          setJobs((prev) => prev.map((job) => (job.id === j.id ? { ...job, lat, lon } : job)));
        }
        // Nominatim courtesy: 1 request per second
        await new Promise((r) => setTimeout(r, 1100));
      } catch {}
    }
    setGeocoding(false);
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const week = new Date(today); week.setDate(today.getDate() + 7);
  const dayEnd = new Date(today); dayEnd.setDate(today.getDate() + 1);

  const filtered = jobs.filter((j) => {
    if (filter === 'today') return j.scheduledFor >= today.getTime() && j.scheduledFor < dayEnd.getTime();
    if (filter === 'week') return j.scheduledFor >= today.getTime() && j.scheduledFor < week.getTime();
    return true;
  }).filter((j) => j.lat && j.lon);

  const sorted = [...filtered].sort((a, b) => a.scheduledFor - b.scheduledFor);

  // Calculate map bounds
  let minLat = 41.5, maxLat = 41.9, minLon = -84.0, maxLon = -83.3; // Default to NW Ohio
  if (filtered.length > 0) {
    minLat = Math.min(...filtered.map((j) => j.lat!)) - 0.02;
    maxLat = Math.max(...filtered.map((j) => j.lat!)) + 0.02;
    minLon = Math.min(...filtered.map((j) => j.lon!)) - 0.02;
    maxLon = Math.max(...filtered.map((j) => j.lon!)) + 0.02;
  }
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

  return (
    <div>
      <TopBar
        title="Map"
        subtitle={`${filtered.length} JOBS · ${filter.toUpperCase()} ${geocoding ? '· GEOCODING...' : ''}`}
        onMenuClick={openSidebar}
        action={
          <div className="flex gap-1">
            {(['today', 'week', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded font-mono text-[10px] tracking-wider uppercase ${
                  filter === f ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
                }`}>
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-[calc(100vh-3.5rem)]">
        {/* Map */}
        <div className="md:col-span-2 relative bg-ink-2 border-r border-rule">
          {loading ? (
            <div className="h-full flex items-center justify-center text-paper-mute font-mono text-xs">Loading map...</div>
          ) : filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center text-paper-mute text-sm p-8 text-center">
              No jobs with addresses in selected range
            </div>
          ) : (
            <div className="relative h-full">
              <iframe
                key={bbox}
                width="100%"
                height="100%"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
                style={{ border: 0, filter: 'invert(0.92) hue-rotate(180deg) brightness(0.9) contrast(0.9)' }}
              />
              {/* Pin overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {filtered.map((j) => {
                  const x = ((j.lon! - minLon) / (maxLon - minLon)) * 100;
                  const y = (1 - (j.lat! - minLat) / (maxLat - minLat)) * 100;
                  const color = j.type === 'lawn' ? '#C8FF3F' : j.type === 'hvac' ? '#6491F5' : '#E8622A';
                  const idx = sorted.findIndex((s) => s.id === j.id);
                  return (
                    <button
                      key={j.id}
                      onClick={() => setSelected(j)}
                      className="absolute pointer-events-auto -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-125 transition-transform"
                      style={{ left: `${x}%`, top: `${y}%` }}>
                      <svg width="22" height="28" viewBox="0 0 22 28" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                        <path d="M11 0 C5 0 0 5 0 11 C0 18 11 28 11 28 C11 28 22 18 22 11 C22 5 17 0 11 0 Z" fill={color}/>
                        <text x="11" y="15" textAnchor="middle" fontSize="11" fontWeight="700" fill="#080806">{idx + 1}</text>
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Job list */}
        <div className="bg-ink overflow-y-auto">
          <div className="px-4 py-3 border-b border-rule sticky top-0 bg-ink z-10">
            <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">Route order</div>
          </div>
          {sorted.length === 0 ? (
            <div className="p-6 text-center text-paper-dim text-sm italic">No jobs to map</div>
          ) : (
            <div className="divide-y divide-rule">
              {sorted.map((j, i) => {
                const time = new Date(j.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const date = new Date(j.scheduledFor).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const color = j.type === 'lawn' ? 'bg-acid' : j.type === 'hvac' ? 'bg-blue-400' : 'bg-signal';
                return (
                  <button
                    key={j.id}
                    onClick={() => setSelected(j)}
                    className={`w-full text-left p-3 hover:bg-ink-2 flex items-start gap-3 ${selected?.id === j.id ? 'bg-ink-2' : ''}`}>
                    <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center font-mono text-xs font-bold text-ink shrink-0`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-paper font-medium truncate">{j.customerName}</div>
                      <div className="font-mono text-[10px] text-paper-mute mt-0.5">{date} · {time}</div>
                      {j.address && <div className="text-[11px] text-paper-mute truncate mt-0.5">{j.address}</div>}
                      <div className="font-mono text-[10px] text-acid mt-1">${j.value}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-ink-2 border border-rule rounded-lg p-4 shadow-2xl z-30">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-sm text-paper font-medium">{selected.customerName}</div>
              <div className="font-mono text-[10px] text-paper-mute mt-0.5">{new Date(selected.scheduledFor).toLocaleString()}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-paper-mute hover:text-paper text-xl leading-none">×</button>
          </div>
          {selected.address && (
            <div className="text-xs text-paper-mute mb-3">{selected.address}</div>
          )}
          <div className="flex gap-2">
            {selected.address && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selected.address)}`} target="_blank" rel="noopener" className="flex-1 text-center px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
                Directions →
              </a>
            )}
            <Link href={`/calendar`} className="flex-1 text-center px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
              View in Calendar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
