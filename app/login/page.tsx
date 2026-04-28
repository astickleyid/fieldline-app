'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body = mode === 'login' ? { email } : { email, businessName, trade, phone };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.push('/dashboard');
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
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                mode === 'login' ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
              }`}>
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                mode === 'signup' ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
              }`}>
              Start Free Pilot
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
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
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="w-full bg-ink border border-rule rounded-md px-3 py-2.5 text-paper placeholder-paper-dim outline-none focus:border-signal/40 transition-colors"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2 font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-signal hover:bg-signal-bright text-white rounded-md text-sm font-medium transition-all disabled:opacity-50">
              {loading ? '...' : mode === 'login' ? 'Sign In →' : 'Start Pilot →'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="mt-4 text-[11px] text-paper-dim font-mono leading-relaxed">
              30 days free · no credit card · we set everything up · cancel anytime
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
