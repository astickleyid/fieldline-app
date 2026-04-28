import { redis } from './redis';
import { Lead, Job, Review, AILogEntry, User, Stats } from './types';

// ─── ID GEN ──────────────────────────────────
export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ─── USERS ───────────────────────────────────
export async function getUserById(userId: string): Promise<User | null> {
  return (await redis.get(`user:${userId}`)) as User | null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const userId = (await redis.get(`useremail:${email.toLowerCase()}`)) as string | null;
  if (!userId) return null;
  return getUserById(userId);
}

export async function createUser(data: {
  email: string;
  businessName: string;
  trade: User['trade'];
  phone?: string;
}): Promise<User> {
  const id = newId('usr');
  const user: User = {
    id,
    email: data.email.toLowerCase(),
    businessName: data.businessName,
    trade: data.trade,
    phone: data.phone,
    createdAt: Date.now(),
  };
  await redis.set(`user:${id}`, user);
  await redis.set(`useremail:${user.email}`, id);
  return user;
}

// ─── LEADS ───────────────────────────────────
export async function listLeads(userId: string): Promise<Lead[]> {
  const ids = (await redis.zrange(`leads:${userId}`, 0, -1, { rev: true })) as string[];
  if (!ids.length) return [];
  const leads = await Promise.all(ids.map((id) => redis.get(`lead:${id}`)));
  return leads.filter(Boolean) as Lead[];
}

export async function createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
  const id = newId('lead');
  const now = Date.now();
  const lead: Lead = { ...data, id, createdAt: now, updatedAt: now };
  await redis.set(`lead:${id}`, lead);
  await redis.zadd(`leads:${data.userId}`, { score: now, member: id });
  return lead;
}

export async function updateLead(leadId: string, patch: Partial<Lead>): Promise<Lead | null> {
  const existing = (await redis.get(`lead:${leadId}`)) as Lead | null;
  if (!existing) return null;
  const updated: Lead = { ...existing, ...patch, updatedAt: Date.now() };
  await redis.set(`lead:${leadId}`, updated);
  return updated;
}

export async function deleteLead(leadId: string, userId: string): Promise<void> {
  await redis.del(`lead:${leadId}`);
  await redis.zrem(`leads:${userId}`, leadId);
}

// ─── JOBS ────────────────────────────────────
export async function listJobs(userId: string): Promise<Job[]> {
  const ids = (await redis.zrange(`jobs:${userId}`, 0, -1)) as string[];
  if (!ids.length) return [];
  const jobs = await Promise.all(ids.map((id) => redis.get(`job:${id}`)));
  return jobs.filter(Boolean) as Job[];
}

export async function createJob(data: Omit<Job, 'id' | 'createdAt'>): Promise<Job> {
  const id = newId('job');
  const job: Job = { ...data, id, createdAt: Date.now() };
  await redis.set(`job:${id}`, job);
  await redis.zadd(`jobs:${data.userId}`, { score: data.scheduledFor, member: id });
  return job;
}

export async function updateJob(jobId: string, patch: Partial<Job>): Promise<Job | null> {
  const existing = (await redis.get(`job:${jobId}`)) as Job | null;
  if (!existing) return null;
  const updated: Job = { ...existing, ...patch };
  await redis.set(`job:${jobId}`, updated);
  if (patch.scheduledFor) {
    await redis.zadd(`jobs:${existing.userId}`, { score: patch.scheduledFor, member: jobId });
  }
  return updated;
}

// ─── REVIEWS ─────────────────────────────────
export async function listReviews(userId: string): Promise<Review[]> {
  const raw = (await redis.lrange(`reviews:${userId}`, 0, 99)) as string[];
  return raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r)) as Review[];
}

export async function createReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
  const r: Review = { ...review, id: newId('rev'), createdAt: Date.now() };
  await redis.lpush(`reviews:${review.userId}`, JSON.stringify(r));
  await redis.ltrim(`reviews:${review.userId}`, 0, 199);
  return r;
}

export async function updateReviewReply(
  userId: string,
  reviewId: string,
  reply: string
): Promise<Review | null> {
  const all = await listReviews(userId);
  const idx = all.findIndex((r) => r.id === reviewId);
  if (idx === -1) return null;
  const updated = { ...all[idx], reply, repliedAt: Date.now() };
  all[idx] = updated;
  // rewrite list
  await redis.del(`reviews:${userId}`);
  if (all.length) {
    await redis.rpush(`reviews:${userId}`, ...all.map((r) => JSON.stringify(r)));
  }
  return updated;
}

// ─── AI LOG ──────────────────────────────────
export async function logAI(userId: string, entry: Omit<AILogEntry, 'id' | 'timestamp'>): Promise<void> {
  const e: AILogEntry = { ...entry, id: newId('ai'), timestamp: Date.now() };
  await redis.lpush(`ai:log:${userId}`, JSON.stringify(e));
  await redis.ltrim(`ai:log:${userId}`, 0, 49);
}

export async function listAILog(userId: string): Promise<AILogEntry[]> {
  const raw = (await redis.lrange(`ai:log:${userId}`, 0, 49)) as string[];
  return raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r)) as AILogEntry[];
}

// ─── STATS (computed) ────────────────────────
export async function computeStats(userId: string): Promise<Stats> {
  const [leads, jobs, reviews] = await Promise.all([
    listLeads(userId),
    listJobs(userId),
    listReviews(userId),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const revenueMTD = jobs
    .filter((j) => j.status === 'completed' && j.scheduledFor >= monthStart)
    .reduce((sum, j) => sum + j.value, 0);

  const jobsBooked = jobs.filter(
    (j) => j.status === 'scheduled' && j.scheduledFor >= monthStart
  ).length;

  const pipelineValue = leads
    .filter((l) => l.status === 'new' || l.status === 'quoted')
    .reduce((sum, l) => sum + l.value, 0);

  const rating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

  return {
    revenueMTD,
    jobsBooked,
    pipelineValue,
    rating,
    reviewCount: reviews.length,
  };
}

// ─── DEMO SEED ───────────────────────────────
export async function seedDemo(userId: string): Promise<void> {
  const trade: Lead['type'] = 'lawn';

  // Sample leads
  const leadData = [
    { name: 'Johnson Residence', status: 'new' as const, type: 'lawn' as const, value: 280, address: '1421 Oak St, Toledo, OH', notes: 'Bi-weekly mowing requested.' },
    { name: 'Baker — Furnace svc', status: 'new' as const, type: 'hvac' as const, value: 950, address: '88 Maple Ave, Maumee, OH', notes: 'Furnace not igniting on cold mornings.' },
    { name: 'Holt Property', status: 'new' as const, type: 'lawn' as const, value: 420, address: '506 Elm, Sylvania, OH', notes: 'Spring cleanup + weekly mow.' },
    { name: 'Williams Estate', status: 'quoted' as const, type: 'plumb' as const, value: 1200, address: '92 Birch, Perrysburg, OH', notes: 'Master bath remodel piping.' },
    { name: 'Monroe Duplex', status: 'quoted' as const, type: 'lawn' as const, value: 160, address: '12 N River, Monroe, MI', notes: 'Both units, weekly.' },
    { name: 'Perrysburg HVAC', status: 'booked' as const, type: 'hvac' as const, value: 2400, address: '1700 Louisiana Ave, Perrysburg, OH' },
    { name: 'Smith — weekly', status: 'booked' as const, type: 'lawn' as const, value: 340, address: '55 Hill Dr, Toledo, OH' },
  ];

  for (const l of leadData) {
    await createLead({
      userId,
      ...l,
      phone: '(419) 555-' + Math.floor(1000 + Math.random() * 9000),
    });
  }

  // Sample reviews
  const reviewData = [
    { customer: 'Marcus T.', rating: 5, text: 'Fast and professional. Will use again.', source: 'google' as const, reply: 'Thanks Marcus! Glad we could fit your schedule.', repliedAt: Date.now() - 1000 * 60 * 14 },
    { customer: 'Denise K.', rating: 5, text: 'Best lawn care I\'ve used in 10 years. They show up when they say they will.', source: 'google' as const, reply: 'Means a lot, Denise. See you next visit.', repliedAt: Date.now() - 1000 * 60 * 60 * 8 },
    { customer: 'Ray J.', rating: 5, text: 'Hired them for HVAC service — quick, honest, fair pricing.', source: 'google' as const },
  ];

  for (const r of reviewData) {
    await createReview({ userId, ...r });
  }

  // Sample AI log
  await logAI(userId, { type: 'quote', summary: 'Quote drafted & sent to Johnson Residence — $280/mo recurring' });
  await logAI(userId, { type: 'review-reply', summary: 'Replied to ★★★★★ from Marcus T.' });
  await logAI(userId, { type: 'follow-up', summary: 'Day-3 follow-up sent to Williams Estate' });
}
