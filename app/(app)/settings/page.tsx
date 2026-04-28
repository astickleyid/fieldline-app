import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/db';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login');
  const user = await getUserById(session.userId);

  return (
    <div>
      <div className="border-b border-rule px-6 h-14 flex items-center sticky top-0 bg-ink/80 backdrop-blur-md z-30">
        <div>
          <h1 className="text-base font-medium">Settings</h1>
          <div className="font-mono text-[10px] text-paper-dim tracking-wider mt-0.5">ACCOUNT &amp; AI CONFIGURATION</div>
        </div>
      </div>

      <div className="p-6 max-w-2xl space-y-4">
        <section className="bg-ink-2 border border-rule rounded-lg p-5">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Account</div>
          <Row label="Business Name" value={user?.businessName || '—'} />
          <Row label="Email" value={user?.email || '—'} />
          <Row label="Trade" value={user?.trade?.toUpperCase() || '—'} />
          <Row label="Phone" value={user?.phone || '—'} />
          <Row label="User ID" value={user?.id || '—'} mono />
          <Row label="Member since" value={user ? new Date(user.createdAt).toLocaleDateString() : '—'} />
        </section>

        <section className="bg-ink-2 border border-rule rounded-lg p-5">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">AI Voice (coming soon)</div>
          <p className="text-xs text-paper-mute leading-relaxed">
            Train Fieldline's AI to write quotes and reviews in your voice. Paste a few examples of how you'd write to customers. AI will match your tone, slang, and style.
          </p>
          <button disabled className="mt-3 px-3 py-1.5 text-xs border border-rule rounded-md text-paper-dim cursor-not-allowed">
            Configure voice →
          </button>
        </section>

        <section className="bg-ink-2 border border-rule rounded-lg p-5">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Pilot status</div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse"/>
            <span className="text-xs text-acid font-mono tracking-wide">PILOT ACTIVE</span>
          </div>
          <p className="text-xs text-paper-mute leading-relaxed">30-day free pilot. Cancel anytime — keep your data.</p>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-rule last:border-0">
      <span className="text-xs text-paper-mute">{label}</span>
      <span className={`text-sm text-paper ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
