'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Business = { id: string; name: string; trade: string; phone?: string };

export default function PublicBookingPage() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', type: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/book?id=${businessId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setBusiness(d.business);
          setForm((f) => ({ ...f, type: d.business.trade }));
        }
        setLoading(false);
      });
  }, [businessId]);

  async function submit() {
    if (!form.name) { setError('Name is required'); return; }
    setError('');
    setSubmitting(true);
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, ...form }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.ok) setSubmitted(true);
    else setError(data.error || 'Something went wrong');
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-paper-mute font-mono text-xs">Loading...</div>
    </div>
  );

  if (!business) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="font-serif italic text-3xl text-paper mb-2">Not found</div>
        <div className="text-sm text-paper-mute">{error || 'This booking link is invalid.'}</div>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg text-center">
        <div className="font-serif italic text-4xl text-paper mb-3">Got it.</div>
        <div className="text-base text-paper-mute mb-6">
          Thanks for reaching out. {business.name} will be in touch within 24 hours.
        </div>
        <div className="bg-acid/10 border border-acid/30 rounded-lg p-4">
          <div className="font-mono text-[10px] text-acid tracking-wider uppercase mb-1">✓ REQUEST RECEIVED</div>
          <div className="text-sm text-paper">Check your phone or email shortly.</div>
        </div>
        {business.phone && (
          <div className="mt-6 text-xs text-paper-mute">
            Need it sooner? Call <a href={`tel:${business.phone}`} className="text-signal hover:text-signal-bright">{business.phone}</a>
          </div>
        )}
      </div>
    </div>
  );

  const tradeLabels: Record<string, string> = {
    lawn: 'Lawn Care', hvac: 'HVAC', plumb: 'Plumbing', other: 'Service',
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-1">Request Service</div>
          <div className="font-serif italic text-4xl text-paper mb-1">{business.name}</div>
          <div className="text-sm text-paper-mute">{tradeLabels[business.trade] || business.trade}</div>
        </div>

        <div className="bg-ink-2 border border-rule rounded-xl overflow-hidden">
          <div className="p-6 sm:p-8 space-y-5">
            <Field label="Your Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Jane Smith"/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(419) 555-1234" type="tel"/>
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="jane@email.com" type="email"/>
            </div>
            <Field label="Property Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="123 Main St, Toledo, OH"/>

            {business.trade === 'lawn' && (
              <div>
                <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-2">Service Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Weekly mow', 'One-time cleanup', 'Landscaping', 'Other'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm({ ...form, notes: opt + (form.notes && !form.notes.startsWith(opt) ? ' — ' + form.notes : '') })}
                      className={`py-2 text-xs rounded-md border ${
                        form.notes.startsWith(opt) ? 'border-signal bg-signal/10 text-signal' : 'border-rule text-paper-mute hover:text-paper'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Tell us about the job</label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="What do you need done? Any specifics about your property, timing, or budget?"
                className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-400/10 border border-red-400/30 rounded-md px-3 py-2 text-xs text-red-400">{error}</div>
            )}

            <button
              onClick={submit}
              disabled={submitting || !form.name}
              className="w-full py-3 bg-signal hover:bg-signal-bright text-white rounded-md text-sm font-medium disabled:opacity-50">
              {submitting ? 'Sending...' : 'Request a Quote →'}
            </button>

            <div className="text-center text-[11px] text-paper-dim">
              By submitting, you agree to be contacted by {business.name}.
            </div>
          </div>
        </div>

        <div className="text-center mt-6 font-mono text-[10px] text-paper-dim tracking-wider">
          Powered by <span className="text-signal">Fieldline</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"
      />
    </div>
  );
}
