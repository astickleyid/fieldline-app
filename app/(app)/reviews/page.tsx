'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Review = {
  id: string;
  customer: string;
  rating: number;
  text: string;
  reply?: string;
  repliedAt?: number;
  source: string;
  createdAt: number;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'replied'>('all');
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
    const res = await fetch('/api/reviews');
    const data = await res.json();
    setReviews(data.reviews || []);
    setLoading(false);
  }

  async function aiReply(reviewId: string) {
    setReplying(reviewId);
    const res = await fetch(`/api/reviews/${reviewId}/reply`, { method: 'POST' });
    const data = await res.json();
    if (data.review) setReviews((prev) => prev.map((r) => (r.id === reviewId ? data.review : r)));
    setReplying(null);
  }

  const filtered = reviews.filter((r) => {
    if (filter === 'unreplied') return !r.reply;
    if (filter === 'replied') return !!r.reply;
    return true;
  });

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';
  const repliedCount = reviews.filter((r) => r.reply).length;

  return (
    <div>
      <TopBar
        title="Reviews"
        subtitle={`${avgRating}★ AVG · ${reviews.length} TOTAL · ${repliedCount} REPLIED`}
        onMenuClick={openSidebar}
        action={
          <button onClick={() => setAdding(true)} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">+ Add Review</button>
        }
      />

      <div className="border-b border-rule px-4 md:px-6 h-12 flex items-center gap-1 bg-ink/40">
        {(['all', 'unreplied', 'replied'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded font-mono text-[10px] tracking-wider uppercase ${
              filter === f ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6 max-w-3xl">
        {loading ? (
          <div className="text-center py-12 font-mono text-xs text-paper-mute">loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-paper-mute mb-2">No reviews</div>
            <div className="text-xs text-paper-dim">Add your first review to test AI replies.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="bg-ink-2 border border-rule rounded-lg p-5 fade-up">
                <div className="mb-3">
                  <div className="text-yellow-400 text-sm tracking-widest mb-1">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                  <div className="text-[14px] text-paper">{r.text}</div>
                  <div className="font-mono text-[10px] text-paper-mute tracking-wider mt-2">
                    {r.customer.toUpperCase()} · {r.source.toUpperCase()} · {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {r.reply ? (
                  <div className="mt-4 pt-4 border-t border-rule">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-acid/10 text-acid border border-acid/20">AI REPLIED</span>
                      <span className="font-mono text-[10px] text-paper-dim">{r.repliedAt ? new Date(r.repliedAt).toLocaleString() : ''}</span>
                    </div>
                    <div className="text-[14px] text-paper-mute italic">"{r.reply}"</div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-rule flex justify-between items-center">
                    <span className="font-mono text-[10px] text-paper-dim tracking-wider uppercase">No reply yet</span>
                    <button
                      onClick={() => aiReply(r.id)}
                      disabled={replying === r.id}
                      className="px-3 py-1.5 bg-signal/10 hover:bg-signal/20 border border-signal/30 text-signal rounded-md text-xs font-medium disabled:opacity-50">
                      {replying === r.id ? 'Generating...' : '⚡ AI Reply'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {adding && <AddReviewModal onClose={() => setAdding(false)} onSaved={load}/>}
    </div>
  );
}

function AddReviewModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [customer, setCustomer] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, rating, text, source: 'fieldline' }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-ink-2 border border-rule rounded-xl w-full max-w-md fade-up">
        <div className="px-5 py-3 border-b border-rule flex justify-between items-center">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">New Review</div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={`w-12 h-12 rounded-md border text-xl ${
                rating >= n ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400' : 'border-rule text-paper-dim'
              }`}>★</button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Review text..." className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40 resize-none"/>
        </div>
        <div className="px-5 py-3 border-t border-rule flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-paper-mute hover:text-paper">Cancel</button>
          <button onClick={save} disabled={saving || !customer || !text} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-50">
            {saving ? '...' : 'Add Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
