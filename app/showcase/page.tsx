// Fieldline — public showcase / marketing landing.
// Renders outside the protected (app) route group, so it is publicly accessible
// with no auth. Used as the portfolio embed and a shareable product overview.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fieldline — The Operating System for Trade Businesses',
  description:
    'Fieldline is a CRM built for lawn care, HVAC, and plumbing businesses. Capture leads, quote with AI, schedule jobs, invoice, and collect reviews — all in one place.',
};

const FEATURES = [
  {
    tag: 'LEADS',
    title: 'Never lose a lead',
    body: 'Every call, form, and booking lands in one pipeline. AI scores each lead by intent so you chase the ones worth chasing first.',
  },
  {
    tag: 'AI QUOTING',
    title: 'Quotes in your voice',
    body: 'Describe the job in a sentence. Fieldline writes a priced, on-brand quote in your tone — trained on your trade and your business.',
  },
  {
    tag: 'JOBS',
    title: 'Schedule & dispatch',
    body: 'Calendar, map view, and recurring jobs. Photos, notes, and status on every job from first contact to paid invoice.',
  },
  {
    tag: 'INVOICING',
    title: 'Get paid faster',
    body: 'Send invoices the second a job wraps. Shareable payment links, automatic follow-ups, and a clean paper trail.',
  },
  {
    tag: 'REVIEWS',
    title: 'Turn jobs into reviews',
    body: 'Automated review requests after every completed job — with AI-drafted replies that keep your reputation sharp.',
  },
  {
    tag: 'AUTOMATIONS',
    title: 'Work that runs itself',
    body: 'Revive cold leads, send follow-ups, and surface daily briefings automatically. The busywork disappears.',
  },
];

const AI_CAPABILITIES = [
  ['Quote', 'Priced, on-brand quotes from a one-line description'],
  ['Score', 'Ranks open leads by conversion intent'],
  ['Revive', 'Re-engages leads gone cold with a tailored message'],
  ['Follow-up', 'Writes the right nudge at the right moment'],
  ['Briefing', 'A morning summary of what needs attention'],
  ['Insights', 'Spots patterns in your pipeline and revenue'],
];

const STEPS = [
  ['01', 'Lead comes in', 'A call, a form, a booking — it lands in Fieldline and gets scored instantly.'],
  ['02', 'Quote goes out', 'AI drafts a priced quote in your voice. You review, tweak, send.'],
  ['03', 'Job gets done', 'Schedule it, track it, photograph it, mark it complete.'],
  ['04', 'You get paid', 'Invoice sends automatically. Payment link included. Review request follows.'],
];

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-ink text-paper font-sans antialiased overflow-x-hidden">
      {/* ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-[0.15]"
          style={{ background: 'radial-gradient(circle, rgba(232,98,42,0.5) 0%, transparent 60%)' }}
        />
      </div>

      {/* nav */}
      <header className="relative border-b border-rule">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-serif italic text-2xl tracking-tight">Fieldline</span>
            <span className="font-mono text-[10px] text-paper-dim tracking-wider">v0.6</span>
          </div>
          <a
            href="/login"
            className="font-mono text-[11px] tracking-wider uppercase px-4 py-2 rounded-md bg-paper text-ink hover:bg-signal hover:text-paper transition-colors"
          >
            Start Free Pilot
          </a>
        </div>
      </header>

      {/* hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-3xl">
          <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-signal mb-6">
            CRM for trade businesses · NW Ohio
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight mb-8">
            The operating system for{' '}
            <span className="italic text-signal">trade businesses.</span>
          </h1>
          <p className="text-lg sm:text-xl text-paper-mute leading-relaxed max-w-2xl mb-10">
            Lawn care, HVAC, plumbing. Fieldline captures your leads, quotes them
            with AI in your own voice, schedules the work, sends the invoice, and
            asks for the review — so you can run the business instead of chasing it.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/login"
              className="font-mono text-[12px] tracking-wider uppercase px-6 py-3.5 rounded-md bg-signal text-paper hover:bg-signal-bright transition-colors"
            >
              Start Free Pilot →
            </a>
            <a
              href="#features"
              className="font-mono text-[12px] tracking-wider uppercase px-6 py-3.5 rounded-md border border-rule text-paper-mute hover:text-paper hover:border-paper-dim transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* stat strip */}
        <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 border-t border-l border-rule">
          {[
            ['7', 'AI capabilities'],
            ['1', 'Pipeline, end to end'],
            ['0', 'Spreadsheets required'],
            ['24/7', 'Lead capture'],
          ].map(([n, l]) => (
            <div key={l} className="border-r border-b border-rule p-6">
              <div className="font-serif text-3xl sm:text-4xl mb-1">{n}</div>
              <div className="font-mono text-[10px] tracking-wider uppercase text-paper-mute">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="mb-14">
          <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-paper-mute mb-4">
            [ What it does ]
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight max-w-2xl">
            Everything from first call to final invoice.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-rule">
          {FEATURES.map((f) => (
            <div key={f.tag} className="border-r border-b border-rule p-8 hover:bg-ink-2 transition-colors">
              <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-signal mb-4">
                {f.tag}
              </div>
              <h3 className="font-serif text-2xl mb-3 tracking-tight">{f.title}</h3>
              <p className="text-paper-mute leading-relaxed text-[15px]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI capabilities */}
      <section className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-14 items-start">
          <div>
            <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-paper-mute mb-4">
              [ Built-in AI ]
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl tracking-tight mb-6">
              Seven AI tools that do the <span className="italic text-signal">busywork.</span>
            </h2>
            <p className="text-paper-mute leading-relaxed text-lg">
              Fieldline runs on Claude. Not a chatbot bolted onto a CRM — real
              automation trained on your trade, your business name, and your voice.
            </p>
          </div>

          <div className="border-t border-l border-rule">
            {AI_CAPABILITIES.map(([name, desc]) => (
              <div key={name} className="border-r border-b border-rule p-5 flex items-baseline gap-5">
                <span className="font-mono text-[12px] tracking-wider uppercase text-signal w-24 shrink-0">
                  {name}
                </span>
                <span className="text-paper-mute text-[15px] leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="mb-14">
          <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-paper-mute mb-4">
            [ The loop ]
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight">
            One system. Four steps. No gaps.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule">
          {STEPS.map(([n, title, body]) => (
            <div key={n} className="bg-ink p-8">
              <div className="font-mono text-[12px] text-signal mb-4">{n}</div>
              <h3 className="font-serif text-xl mb-3 tracking-tight">{title}</h3>
              <p className="text-paper-mute text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-6xl mx-auto px-6 py-24">
        <div className="border border-rule rounded-2xl p-12 sm:p-16 text-center bg-ink-2 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.12]"
            style={{ background: 'radial-gradient(circle at 50% 0%, rgba(232,98,42,0.6) 0%, transparent 55%)' }}
          />
          <div className="relative">
            <h2 className="font-serif text-4xl sm:text-5xl tracking-tight mb-5">
              Run the business. <span className="italic text-signal">Not the chaos.</span>
            </h2>
            <p className="text-paper-mute text-lg max-w-xl mx-auto mb-9 leading-relaxed">
              Fieldline is in active pilot with trade businesses across Northwest Ohio.
              Start free — no card, no setup call.
            </p>
            <a
              href="/login"
              className="inline-block font-mono text-[12px] tracking-wider uppercase px-8 py-4 rounded-md bg-signal text-paper hover:bg-signal-bright transition-colors"
            >
              Start Free Pilot →
            </a>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="relative border-t border-rule">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-serif italic text-lg">Fieldline</span>
            <span className="font-mono text-[10px] text-paper-dim tracking-wider">
              CRM for trade businesses
            </span>
          </div>
          <div className="font-mono text-[10px] tracking-wider uppercase text-paper-mute">
            Northwest Ohio · Southeast Michigan
          </div>
        </div>
      </footer>
    </div>
  );
}
