'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SearchResults {
  leads?: any[];
  customers?: any[];
  jobs?: any[];
}

export default function TopBar({ title, subtitle, action, onMenuClick }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onMenuClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({});
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query || query.length < 2) { setResults({}); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  const totalResults = (results.leads?.length || 0) + (results.customers?.length || 0) + (results.jobs?.length || 0);

  return (
    <div className="border-b border-rule px-4 md:px-6 h-14 flex items-center justify-between sticky top-0 bg-ink/85 backdrop-blur-md z-30">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 -ml-1 text-paper-mute hover:text-paper">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base font-medium truncate">{title}</h1>
          {subtitle && <div className="font-mono text-[10px] text-paper-dim tracking-wider mt-0.5 truncate">{subtitle}</div>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search trigger */}
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 bg-ink-2 border border-rule rounded-md text-xs text-paper-mute hover:text-paper hover:border-paper-dim transition-all">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/><path d="M8.5 8.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <span className="hidden sm:inline">Search</span>
          <span className="hidden sm:inline font-mono text-[10px] text-paper-dim ml-1 px-1 py-0.5 bg-rule rounded">⌘K</span>
        </button>
        {action}
      </div>

      {/* Search modal */}
      {open && (
        <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh] px-4">
          <div ref={ref} className="bg-ink-2 border border-rule rounded-xl w-full max-w-xl shadow-2xl">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-rule">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-paper-mute"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search leads, customers, jobs..."
                className="flex-1 bg-transparent text-paper outline-none text-sm placeholder-paper-dim"
              />
              <kbd className="font-mono text-[10px] text-paper-dim bg-rule px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {loading && <div className="px-4 py-6 text-center text-xs text-paper-mute font-mono">searching...</div>}
              {!loading && query.length >= 2 && totalResults === 0 && (
                <div className="px-4 py-6 text-center text-xs text-paper-mute">No results for "{query}"</div>
              )}
              {!loading && query.length < 2 && (
                <div className="px-4 py-6 text-center text-xs text-paper-mute">Type at least 2 characters</div>
              )}
              {results.leads && results.leads.length > 0 && (
                <ResultGroup title="Leads" items={results.leads.map((l: any) => ({
                  id: l.id, label: l.name, sub: `${l.status} · ${l.type} · $${l.value}`, href: `/leads/${l.id}`,
                }))} onPick={(href) => { setOpen(false); router.push(href); }}/>
              )}
              {results.customers && results.customers.length > 0 && (
                <ResultGroup title="Customers" items={results.customers.map((c: any) => ({
                  id: c.id, label: c.name, sub: `${c.jobCount} jobs · $${c.totalSpent} lifetime`, href: `/customers/${c.id}`,
                }))} onPick={(href) => { setOpen(false); router.push(href); }}/>
              )}
              {results.jobs && results.jobs.length > 0 && (
                <ResultGroup title="Jobs" items={results.jobs.map((j: any) => ({
                  id: j.id, label: j.customerName, sub: `${new Date(j.scheduledFor).toLocaleDateString()} · ${j.status}`, href: `/calendar`,
                }))} onPick={(href) => { setOpen(false); router.push(href); }}/>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, items, onPick }: { title: string; items: { id: string; label: string; sub: string; href: string }[]; onPick: (href: string) => void }) {
  return (
    <div className="border-t border-rule first:border-0">
      <div className="px-4 py-2 font-mono text-[10px] text-paper-mute tracking-wider uppercase">{title}</div>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onPick(item.href)}
          className="w-full text-left px-4 py-2.5 hover:bg-rule transition-colors flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-paper truncate">{item.label}</div>
            <div className="text-[11px] text-paper-mute font-mono truncate">{item.sub}</div>
          </div>
          <span className="text-paper-dim text-xs">→</span>
        </button>
      ))}
    </div>
  );
}
