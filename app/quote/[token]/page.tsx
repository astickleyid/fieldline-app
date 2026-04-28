import { notFound } from 'next/navigation';
import { getLeadByQuoteToken, getUserById } from '@/lib/db';
import AcceptButton from './AcceptButton';

export const dynamic = 'force-dynamic';

export default async function PublicQuotePage({ params }: { params: { token: string } }) {
  const lead = await getLeadByQuoteToken(params.token);
  if (!lead) notFound();
  const user = await getUserById(lead.userId);

  const accepted = !!lead.quoteAcceptedAt;
  const isBooked = lead.status === 'booked' || lead.status === 'completed';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="font-serif italic text-3xl text-paper mb-1">{user?.businessName || 'Quote'}</div>
          <div className="font-mono text-[11px] text-paper-mute tracking-wider">QUOTE FOR {lead.name.toUpperCase()}</div>
        </div>

        <div className="bg-ink-2 border border-rule rounded-xl overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-rule">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-1">Project</div>
                <div className="text-xl text-paper font-medium">{lead.name}</div>
                {lead.address && <div className="text-sm text-paper-mute mt-1">{lead.address}</div>}
                <div className="font-mono text-[10px] text-paper-mute uppercase tracking-wider mt-2">{lead.type}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-1">Total</div>
                <div className="font-serif italic text-5xl text-acid leading-none">${lead.value.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {lead.quote ? (
            <div className="p-6 sm:p-8 border-b border-rule">
              <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-3">Quote details</div>
              <div className="bg-ink border border-rule rounded-md p-4 text-sm text-paper leading-relaxed whitespace-pre-wrap">
                {lead.quote}
              </div>
            </div>
          ) : null}

          {!accepted && !isBooked ? (
            <div className="p-6 sm:p-8 bg-acid/5 border-b border-rule">
              <div className="text-center mb-4">
                <div className="text-sm text-paper-mute">Click below to accept this quote and let us know you're ready to book.</div>
              </div>
              <AcceptButton leadId={lead.id}/>
              <div className="mt-3 text-center text-[11px] text-paper-dim">
                Questions? Contact {user?.businessName || 'us'}{user?.phone ? ` at ${user.phone}` : ''}{user?.email ? ` or ${user.email}` : ''}
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 bg-acid/10 border-b border-rule">
              <div className="text-center">
                <div className="font-mono text-acid tracking-wider text-sm mb-1">✓ ACCEPTED</div>
                <div className="text-sm text-paper-mute">
                  {lead.quoteAcceptedAt
                    ? `You accepted this quote on ${new Date(lead.quoteAcceptedAt).toLocaleDateString()}.`
                    : 'This quote is already booked.'}
                </div>
                <div className="text-xs text-paper-dim mt-2">
                  {user?.businessName || 'The business'} will be in touch to schedule.
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 text-center text-[11px] text-paper-dim font-mono tracking-wider">
            Quote {lead.id.slice(-6).toUpperCase()} · Issued {new Date(lead.quoteGeneratedAt || lead.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="text-center mt-6 font-mono text-[10px] text-paper-dim tracking-wider">
          Powered by Fieldline
        </div>
      </div>
    </div>
  );
}
