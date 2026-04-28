'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const { openSidebar } = useShell();

  useEffect(() => {
    fetch('/api/stats').then(() => {
      // Stats endpoint requires auth, so if it works we're auth'd
      // Now fetch user info — we'll use a custom endpoint via stats
    });
    // Just fetch user via search endpoint that returns nothing on empty query
    // Easier: use the customers endpoint and infer from session, or build /api/me
    // For now, just hit /api/auth/me (we'll add this)
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      setUser(d.user);
      setForm(d.user || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      setEditing(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div>
      <TopBar
        title="Settings"
        subtitle="ACCOUNT & AI CONFIGURATION"
        onMenuClick={openSidebar}
        action={
          <div className="flex items-center gap-2">
            {savedNotice && <span className="text-acid font-mono text-[10px] tracking-wider">✓ SAVED</span>}
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setForm(user); }} className="px-3 py-1.5 text-xs text-paper-mute hover:text-paper">Cancel</button>
                <button onClick={save} disabled={saving} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">{saving ? '...' : 'Save'}</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-paper-dim hover:bg-rule text-paper rounded-md text-xs font-medium">Edit</button>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-6 max-w-2xl space-y-4">
        {loading ? (
          <div className="text-center py-12 font-mono text-xs text-paper-mute">Loading...</div>
        ) : (
          <>
            <section className="bg-ink-2 border border-rule rounded-lg p-5">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Business</div>
              <div className="space-y-3">
                <Row label="Business Name" value={editing ? <input className="bg-ink border border-rule rounded px-2 py-1 text-sm w-full" value={form.businessName || ''} onChange={(e) => setForm({ ...form, businessName: e.target.value })}/> : (user?.businessName || '—')}/>
                <Row label="Email" value={user?.email || '—'}/>
                <Row label="Trade" value={editing ? (
                  <div className="flex gap-1">
                    {(['lawn', 'hvac', 'plumb', 'other'] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setForm({ ...form, trade: t })} className={`px-2 py-1 text-[10px] uppercase rounded border ${
                        form.trade === t ? 'border-signal bg-signal/10 text-signal' : 'border-rule text-paper-mute'
                      }`}>{t}</button>
                    ))}
                  </div>
                ) : (user?.trade?.toUpperCase() || '—')}/>
                <Row label="Phone" value={editing ? <input className="bg-ink border border-rule rounded px-2 py-1 text-sm w-full" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })}/> : (user?.phone || '—')}/>
              </div>
            </section>

            <section className="bg-ink-2 border border-rule rounded-lg p-5">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-2">AI Voice</div>
              <p className="text-xs text-paper-mute mb-3 leading-relaxed">
                Tell Fieldline how you talk to customers. AI will match your tone in quotes, replies, and follow-ups.
              </p>
              {editing ? (
                <textarea
                  rows={4}
                  value={form.voice || ''}
                  onChange={(e) => setForm({ ...form, voice: e.target.value })}
                  placeholder="e.g. Casual but professional. No corporate-speak. I keep things short and to the point. Sometimes use 'y'all'. Avoid emoji."
                  className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40 resize-none"
                />
              ) : (
                <div className="bg-ink border border-rule rounded-md p-3 text-sm text-paper">
                  {user?.voice || <span className="text-paper-dim italic">No voice set yet — click Edit to add one.</span>}
                </div>
              )}
            </section>

            <section className="bg-ink-2 border border-rule rounded-lg p-5">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-2">Public Booking Link</div>
              <p className="text-xs text-paper-mute mb-3 leading-relaxed">
                Share this link on your website, business cards, or social media. Anyone who visits it can request a quote — and it lands directly in your pipeline.
              </p>
              {user?.id && typeof window !== 'undefined' && (
                <div className="space-y-2">
                  <div className="bg-ink border border-rule rounded-md p-2 font-mono text-[11px] text-paper break-all">
                    {window.location.origin}/book/{user.id}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/book/${user.id}`)}
                      className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
                      Copy Link
                    </button>
                    <a
                      href={`/book/${user.id}`}
                      target="_blank"
                      rel="noopener"
                      className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
                      Preview →
                    </a>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-ink-2 border border-rule rounded-lg p-5">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Pilot Status</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse"/>
                <span className="text-xs text-acid font-mono tracking-wide">PILOT ACTIVE</span>
              </div>
              <p className="text-xs text-paper-mute leading-relaxed">
                Member since {user ? new Date(user.createdAt).toLocaleDateString() : '—'}.
                Cancel anytime — your data stays yours.
              </p>
            </section>

            <section className="bg-ink-2 border border-rule rounded-lg p-5">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Diagnostic</div>
              <a href="/diagnostic" className="text-sm text-signal hover:text-signal-bright">Run system diagnostic →</a>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3 py-1">
      <span className="text-xs text-paper-mute shrink-0 w-32">{label}</span>
      <span className="text-sm text-paper text-right flex-1">{value}</span>
    </div>
  );
}
