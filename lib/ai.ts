import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

export async function generateQuote(input: {
  jobDescription: string;
  trade: string;
  businessName: string;
  voice?: string;
}): Promise<string> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: `You are a quote writer for ${input.businessName}, a ${input.trade} business in Northwest Ohio. Write quotes that are professional, direct, and trade-friendly. No corporate fluff. Match this owner's voice: ${input.voice || 'confident, friendly, no-nonsense'}.`,
    messages: [
      {
        role: 'user',
        content: `Write a quote for this job: ${input.jobDescription}\n\nFormat as:\n- One-line summary of work\n- Price breakdown (be specific with rates)\n- Recommended next step\n- Brief sign-off\n\nKeep it under 120 words.`,
      },
    ],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function replyToReview(input: {
  reviewText: string;
  rating: number;
  customer: string;
  businessName: string;
  voice?: string;
}): Promise<string> {
  const tone =
    input.rating >= 4
      ? 'warm, grateful, brief'
      : input.rating === 3
      ? 'professional, eager to make it right, brief'
      : 'apologetic, accountable, professional, offer to talk by phone';

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 250,
    system: `You write Google Review replies for ${input.businessName}. Tone: ${tone}. Match this voice: ${input.voice || 'genuine, local, human'}. Never sound corporate or AI-generated. Keep replies under 50 words.`,
    messages: [
      {
        role: 'user',
        content: `Customer ${input.customer} left a ${input.rating}-star review:\n\n"${input.reviewText}"\n\nWrite the reply only — no preamble, no explanations.`,
      },
    ],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function writeFollowUp(input: {
  leadName: string;
  daysSinceQuote: number;
  jobDescription: string;
  businessName: string;
  voice?: string;
}): Promise<string> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: `You write follow-up text messages for ${input.businessName}. Match this voice: ${input.voice || 'casual, direct, friendly Midwestern'}. NEVER sound like a sales script or automated message. Talk like the owner texting personally.`,
    messages: [
      {
        role: 'user',
        content: `Lead "${input.leadName}" got a quote ${input.daysSinceQuote} days ago for: ${input.jobDescription}. They haven't responded.\n\nWrite a short follow-up text (under 30 words) that feels human. No "I just wanted to" openers. Just go.`,
      },
    ],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

// ─── ADVANCED AI ────────────────────────────────────────────

export async function scoreLeads(input: {
  leads: Array<{ id: string; name: string; status: string; type: string; value: number; source?: string; notes?: string; quote?: string; address?: string; createdAt: number; updatedAt: number; }>;
  trade: string;
  businessName: string;
}): Promise<Array<{ id: string; score: number; reasoning: string }>> {
  if (input.leads.length === 0) return [];

  const leadSummary = input.leads.map((l, i) => {
    const ageHours = Math.floor((Date.now() - l.createdAt) / 3600000);
    const idleHours = Math.floor((Date.now() - l.updatedAt) / 3600000);
    return `${i + 1}. ${l.id} | ${l.name} | ${l.status} | ${l.type} | $${l.value} | source: ${l.source || 'unknown'} | age: ${ageHours}h | idle: ${idleHours}h | quote_sent: ${!!l.quote} | notes: ${(l.notes || '').slice(0, 80)}`;
  }).join('\n');

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `You score leads for ${input.businessName}, a ${input.trade} business. For each lead, give a close-probability score from 0-100 and a one-sentence reasoning. Consider: time-since-contact (cold = lower), quote sent = higher, source quality (referrals > yard signs > random), value vs typical (huge values often less likely), idle time, and stage in pipeline. Return JSON only.`,
    messages: [
      {
        role: 'user',
        content: `Score these leads. Return ONLY valid JSON in this exact format:\n[{"id":"lead_xxx","score":75,"reasoning":"Quote sent 2 days ago, warm referral, typical job size"}, ...]\n\nLeads:\n${leadSummary}`,
      },
    ],
  });
  const block = msg.content[0];
  const raw = block.type === 'text' ? block.text : '';
  // Strip code fences and parse
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON array in output
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return [];
  }
}

export async function dailyBriefing(input: {
  businessName: string;
  trade: string;
  stats: any;
  newLeads: any[];
  staleLeads: any[];
  todayJobs: any[];
  overdueInvoices: any[];
  newReviews: any[];
}): Promise<string> {
  const ctx = JSON.stringify({
    stats: input.stats,
    new_leads_today: input.newLeads.slice(0, 5).map((l) => `${l.name} ($${l.value}, ${l.source || 'unknown'})`),
    stale_leads: input.staleLeads.slice(0, 5).map((l) => `${l.name} (${l.status}, idle ${Math.floor((Date.now() - l.updatedAt) / 3600000)}h)`),
    todays_jobs: input.todayJobs.map((j) => `${new Date(j.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ${j.customerName} ($${j.value})`),
    overdue_invoices: input.overdueInvoices.slice(0, 5).map((i) => `${i.customerName}: $${i.amount}`),
    new_reviews: input.newReviews.slice(0, 5).map((r) => `${r.rating}★ from ${r.customer}`),
  });

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: `You are the operations briefing AI for ${input.businessName}, a ${input.trade} business in Northwest Ohio. Write a sharp, scannable morning briefing. Plainspoken, direct, friendly. Like a chief of staff who respects the owner's time. Use short bullets. Lead with what needs attention TODAY.`,
    messages: [
      {
        role: 'user',
        content: `Write today's briefing using this data:\n\n${ctx}\n\nFormat:\n**Today's bottom line:** [one sentence]\n\n**Needs your attention:**\n- [bullet]\n- [bullet]\n\n**Today's schedule:**\n- [bullet]\n\n**Wins:** (only if any)\n- [bullet]\n\nKeep it under 200 words. Don't repeat the data verbatim — synthesize it.`,
      },
    ],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function suggestPrice(input: {
  jobDescription: string;
  trade: string;
  similarJobs: Array<{ description: string; value: number }>;
  businessName: string;
}): Promise<{ suggested: number; reasoning: string; range: { low: number; high: number } }> {
  const similar = input.similarJobs.length > 0
    ? input.similarJobs.slice(0, 10).map((j) => `- "${j.description}" → $${j.value}`).join('\n')
    : 'No similar past jobs in history.';

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: `You suggest prices for a ${input.trade} business in Northwest Ohio. Respond ONLY with valid JSON: {"suggested":250,"low":200,"high":300,"reasoning":"..."}`,
    messages: [
      {
        role: 'user',
        content: `Suggest a price for this new job:\n"${input.jobDescription}"\n\nPast similar jobs from this business:\n${similar}\n\nReturn JSON only.`,
      },
    ],
  });
  const block = msg.content[0];
  const raw = block.type === 'text' ? block.text : '{}';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      suggested: Number(parsed.suggested) || 0,
      range: { low: Number(parsed.low) || 0, high: Number(parsed.high) || 0 },
      reasoning: parsed.reasoning || '',
    };
  } catch {
    return { suggested: 0, range: { low: 0, high: 0 }, reasoning: 'Could not parse suggestion' };
  }
}
