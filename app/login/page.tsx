'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  // Form fields
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [trade, setTrade] = useState<'lawn' | 'hvac' | 'plumb' | 'other'>('lawn');
  const [phone, setPhone] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = awaitingCode ? '/api/auth/verify' : mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body = awaitingCode ? { code } : mode === 'login' ? { email } : { email, businessName, trade, phone };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (awaitingCode) { router.replace('/dashboard'); router.refresh(); }
      else { setAwaitingCode(true); setCode(''); setMessage(data.message); }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, rgba(232,98,42,0.4) 0%, transparent 65%)' }}/>
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-baseline gap-2 mb-2">
            <span className="font-serif italic text-4xl tracking-tight">Fieldline</span>
            <span className="font-mono text-[10px] text-paper-dim tracking-wider">v0.42</span>
          </div>
          <p className="text-paper-mute text-sm">CRM for trade businesses · NW Ohio</p>
        </div>

        {/* Card */}
        <div className="bg-ink-2 border border-rule rounded-xl p-8">
          <div className="flex gap-1 mb-6 p-1 bg-ink rounded-lg border border-rule">
            <button
              disabled={loading}
              onClick={() => { setMode('login'); setAwaitingCode(false); setCode(''); setError(''); setMessage(''); }}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                mode === 'login' ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
              }`}>
              Sign In
            </button>
            <button
              disabled={loading}
              onClick={() => { setMode('signup'); setAwaitingCode(false); setCode(''); setError(''); setMessage(''); }}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                mode === 'signup' ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
              }`}>
              Start Free Pilot
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && !awaitingCode && (
              <>
                <div>
                  <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-2">Business Name</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Grasslane Lawn Co."
                    className="w-full bg-ink border border-rule rounded-md px-3 py-2.5 text-paper placeholder-paper-dim outline-none focus:border-signal/40 transition-colors"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-2">Trade</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['lawn', 'hvac', 'plumb', 'other'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTrade(t)}
                        className={`py-2 px-2 rounded-md text-xs font-medium border transition-all ${
                          trade === t
                            ? 'border-signal bg-signal/10 text-signal'
                            : 'border-rule text-paper-mute hover:text-paper hover:border-paper-dim'
                        }`}>
                        {t === 'lawn' ? 'Lawn' : t === 'hvac' ? 'HVAC' : t === 'plumb' ? 'Plumbing' : 'Other'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-2">Phone (optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(419) 555-1234"
                    className="w-full bg-ink border border-rule rounded-md px-3 py-2.5 text-paper placeholder-paper-dim outline-none focus:border-signal/40 transition-colors"
                  />
                </div>
              </>
            )}

            <div>
              <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-2">Email</label>
              <input
                type="email"
                disabled={awaitingCode || loading}
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="w-full bg-ink border border-rule rounded-md px-3 py-2.5 text-paper placeholder-paper-dim outline-none focus:border-signal/40 transition-colors"
              />
            </div>

            {awaitingCode && (
              <div>
                <p role="status" className="text-sm text-paper-mute mb-3">{message}</p>
                <label htmlFor="verification-code" className="text-sm block mb-2">8-digit verification code</label>
                <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code"
                  pattern="[0-9]{8}" maxLength={8} required autoFocus value={code} disabled={loading}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-ink border border-rule rounded-md px-3 py-2.5 text-paper" />
                <p className="text-xs text-paper-mute mt-2">Expires after 10 minutes. Keep this browser tab open.</p>
                <button type="button" disabled={loading} className="text-sm text-signal mt-3"
                  onClick={() => { setAwaitingCode(false); setCode(''); setError(''); setMessage(''); }}>
                  Change email or request another code
                </button>
              </div>
            )}

            {error && (
              <div role="alert" className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2 font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-signal hover:bg-signal-bright text-white rounded-md text-sm font-medium transition-all disabled:opacity-50">
              {loading ? 'Please wait…' : awaitingCode ? 'Verify and sign in →' : 'Email me a sign-in code →'}
            </button>
          </form>

          {mode === 'signup' && !awaitingCode && (
            <p className="mt-4 text-[11px] text-paper-dim font-mono leading-relaxed">
              30 days free · no credit card · we set everything up · cancel anytime
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
