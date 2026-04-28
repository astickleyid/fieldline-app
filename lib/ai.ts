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
