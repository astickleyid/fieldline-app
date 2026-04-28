import { redis } from './redis';
import { Lead, Job, Review, AILogEntry, User, Stats, Customer, Invoice, Activity, ActivityType } from './types';

// ─── ID GEN ──────────────────────────────────
export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ─── ACTIVITY LOG ────────────────────────────
export async function logActivity(
  userId: string,
  type: ActivityType,
  message: string,
  refs: { leadId?: string; customerId?: string; jobId?: string; metadata?: Record<string, any> } = {}
): Promise<void> {
  const a: Activity = {
    id: newId('act'),
    userId,
    type,
    message,
    timestamp: Date.now(),
    ...refs,
  };
  await redis.lpush(`activity:${userId}`, JSON.stringify(a));
  await redis.ltrim(`activity:${userId}`, 0, 499);
  if (refs.leadId) {
    await redis.lpush(`activity:lead:${refs.leadId}`, JSON.stringify(a));
    await redis.ltrim(`activity:lead:${refs.leadId}`, 0, 199);
  }
  if (refs.customerId) {
    await redis.lpush(`activity:customer:${refs.customerId}`, JSON.stringify(a));
    await redis.ltrim(`activity:customer:${refs.customerId}`, 0, 199);
  }
  if (refs.jobId) {
    await redis.lpush(`activity:job:${refs.jobId}`, JSON.stringify(a));
    await redis.ltrim(`activity:job:${refs.jobId}`, 0, 199);
  }
}

export async function listActivity(userId: string, limit = 50): Promise<Activity[]> {
  const raw = (await redis.lrange(`activity:${userId}`, 0, limit - 1)) as string[];
  return raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r)) as Activity[];
}

export async function listLeadActivity(leadId: string): Promise<Activity[]> {
  const raw = (await redis.lrange(`activity:lead:${leadId}`, 0, 99)) as string[];
  return raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r)) as Activity[];
}

export async function listCustomerActivity(customerId: string): Promise<Activity[]> {
  const raw = (await redis.lrange(`activity:customer:${customerId}`, 0, 99)) as string[];
  return raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r)) as Activity[];
}

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

export async function updateUser(userId: string, patch: Partial<User>): Promise<User | null> {
  const existing = await getUserById(userId);
  if (!existing) return null;
  const updated: User = { ...existing, ...patch };
  await redis.set(`user:${userId}`, updated);
  return updated;
}

// ─── CUSTOMERS ───────────────────────────────
export async function listCustomers(userId: string): Promise<Customer[]> {
  const ids = (await redis.zrange(`customers:${userId}`, 0, -1, { rev: true })) as string[];
  if (!ids.length) return [];
  const customers = await Promise.all(ids.map((id) => redis.get(`customer:${id}`)));
  return customers.filter(Boolean) as Customer[];
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  return (await redis.get(`customer:${customerId}`)) as Customer | null;
}

export async function createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'firstSeenAt' | 'totalSpent' | 'jobCount'>): Promise<Customer> {
  const id = newId('cust');
  const now = Date.now();
  const customer: Customer = {
    ...data,
    id,
    totalSpent: 0,
    jobCount: 0,
    firstSeenAt: now,
    createdAt: now,
  };
  await redis.set(`customer:${id}`, customer);
  await redis.zadd(`customers:${data.userId}`, { score: now, member: id });
  return customer;
}

export async function updateCustomer(customerId: string, patch: Partial<Customer>): Promise<Customer | null> {
  const existing = await getCustomer(customerId);
  if (!existing) return null;
  const updated: Customer = { ...existing, ...patch };
  await redis.set(`customer:${customerId}`, updated);
  return updated;
}

export async function deleteCustomer(customerId: string, userId: string): Promise<void> {
  await redis.del(`customer:${customerId}`);
  await redis.zrem(`customers:${userId}`, customerId);
}

// ─── LEADS ───────────────────────────────────
export async function listLeads(userId: string): Promise<Lead[]> {
  const ids = (await redis.zrange(`leads:${userId}`, 0, -1, { rev: true })) as string[];
  if (!ids.length) return [];
  const leads = await Promise.all(ids.map((id) => redis.get(`lead:${id}`)));
  return leads.filter(Boolean) as Lead[];
}

export async function getLead(leadId: string): Promise<Lead | null> {
  return (await redis.get(`lead:${leadId}`)) as Lead | null;
}

export async function createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
  const id = newId('lead');
  const now = Date.now();
  const lead: Lead = { ...data, id, createdAt: now, updatedAt: now };
  await redis.set(`lead:${id}`, lead);
  await redis.zadd(`leads:${data.userId}`, { score: now, member: id });
  await logActivity(data.userId, 'lead-created', `Lead created: ${lead.name}`, { leadId: id });
  return lead;
}

export async function updateLead(leadId: string, patch: Partial<Lead>): Promise<Lead | null> {
  const existing = (await redis.get(`lead:${leadId}`)) as Lead | null;
  if (!existing) return null;
  const updated: Lead = { ...existing, ...patch, updatedAt: Date.now() };
  await redis.set(`lead:${leadId}`, updated);
  if (patch.status && patch.status !== existing.status) {
    await logActivity(
      existing.userId,
      'lead-status-changed',
      `${existing.name}: ${existing.status} → ${patch.status}`,
      { leadId, metadata: { from: existing.status, to: patch.status } }
    );
  }
  return updated;
}

export async function deleteLead(leadId: string, userId: string): Promise<void> {
  await redis.del(`lead:${leadId}`);
  await redis.zrem(`leads:${userId}`, leadId);
}

export async function getLeadByQuoteToken(token: string): Promise<Lead | null> {
  const leadId = (await redis.get(`quotetoken:${token}`)) as string | null;
  if (!leadId) return null;
  return getLead(leadId);
}

export async function setLeadQuoteToken(leadId: string, token: string): Promise<void> {
  await redis.set(`quotetoken:${token}`, leadId);
  await updateLead(leadId, { quoteAcceptToken: token });
}

// ─── JOBS ────────────────────────────────────
export async function listJobs(userId: string): Promise<Job[]> {
  const ids = (await redis.zrange(`jobs:${userId}`, 0, -1)) as string[];
  if (!ids.length) return [];
  const jobs = await Promise.all(ids.map((id) => redis.get(`job:${id}`)));
  return jobs.filter(Boolean) as Job[];
}

export async function getJob(jobId: string): Promise<Job | null> {
  return (await redis.get(`job:${jobId}`)) as Job | null;
}

export async function createJob(data: Omit<Job, 'id' | 'createdAt'>): Promise<Job> {
  const id = newId('job');
  const job: Job = { ...data, id, createdAt: Date.now() };
  await redis.set(`job:${id}`, job);
  await redis.zadd(`jobs:${data.userId}`, { score: data.scheduledFor, member: id });
  await logActivity(
    data.userId,
    'job-scheduled',
    `Job scheduled: ${job.customerName} on ${new Date(job.scheduledFor).toLocaleDateString()}`,
    { jobId: id, leadId: data.leadId, customerId: data.customerId }
  );
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
  if (patch.status === 'completed' && existing.status !== 'completed') {
    await logActivity(existing.userId, 'job-completed', `Job completed: ${existing.customerName} ($${existing.value})`, {
      jobId, leadId: existing.leadId, customerId: existing.customerId,
    });
    if (existing.customerId) {
      const customer = await getCustomer(existing.customerId);
      if (customer) {
        await updateCustomer(existing.customerId, {
          totalSpent: customer.totalSpent + existing.value,
          jobCount: customer.jobCount + 1,
          lastJobAt: Date.now(),
        });
      }
    }
  }
  return updated;
}

export async function deleteJob(jobId: string, userId: string): Promise<void> {
  await redis.del(`job:${jobId}`);
  await redis.zrem(`jobs:${userId}`, jobId);
}

export async function generateRecurringJobs(parentJobId: string): Promise<Job[]> {
  const parent = await getJob(parentJobId);
  if (!parent || !parent.recurring) return [];
  const intervalDays = parent.recurring === 'weekly' ? 7 : parent.recurring === 'biweekly' ? 14 : 30;
  const created: Job[] = [];
  for (let i = 1; i <= 4; i++) {
    const next = new Date(parent.scheduledFor);
    next.setDate(next.getDate() + intervalDays * i);
    const { id: _i, createdAt: _c, ...rest } = parent;
    const job = await createJob({
      ...rest,
      scheduledFor: next.getTime(),
      status: 'scheduled',
      parentJobId: parent.id,
    });
    created.push(job);
  }
  return created;
}

// ─── INVOICES ────────────────────────────────
export async function listInvoices(userId: string): Promise<Invoice[]> {
  const ids = (await redis.zrange(`invoices:${userId}`, 0, -1, { rev: true })) as string[];
  if (!ids.length) return [];
  const invoices = await Promise.all(ids.map((id) => redis.get(`invoice:${id}`)));
  return invoices.filter(Boolean) as Invoice[];
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  return (await redis.get(`invoice:${invoiceId}`)) as Invoice | null;
}

export async function getInvoiceByPublicToken(token: string): Promise<Invoice | null> {
  const invoiceId = (await redis.get(`invoicepub:${token}`)) as string | null;
  if (!invoiceId) return null;
  return getInvoice(invoiceId);
}

export async function createInvoice(data: Omit<Invoice, 'id' | 'createdAt' | 'publicToken'>): Promise<Invoice> {
  const id = newId('inv');
  const publicToken = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  const invoice: Invoice = { ...data, id, publicToken, createdAt: Date.now() };
  await redis.set(`invoice:${id}`, invoice);
  await redis.set(`invoicepub:${publicToken}`, id);
  await redis.zadd(`invoices:${data.userId}`, { score: Date.now(), member: id });
  return invoice;
}

export async function updateInvoice(invoiceId: string, patch: Partial<Invoice>): Promise<Invoice | null> {
  const existing = await getInvoice(invoiceId);
  if (!existing) return null;
  const updated: Invoice = { ...existing, ...patch };
  await redis.set(`invoice:${invoiceId}`, updated);
  if (patch.status === 'sent' && existing.status !== 'sent') {
    await logActivity(existing.userId, 'invoice-sent', `Invoice sent to ${existing.customerName} for $${existing.amount}`, {
      leadId: existing.leadId, customerId: existing.customerId, jobId: existing.jobId,
    });
  }
  if (patch.status === 'paid' && existing.status !== 'paid') {
    await logActivity(existing.userId, 'invoice-paid', `Invoice paid: ${existing.customerName} ($${existing.amount})`, {
      leadId: existing.leadId, customerId: existing.customerId, jobId: existing.jobId,
    });
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
  await logActivity(review.userId, 'review-received', `${review.rating}★ from ${review.customer}`, {});
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
  await redis.del(`reviews:${userId}`);
  if (all.length) {
    await redis.rpush(`reviews:${userId}`, ...all.map((r) => JSON.stringify(r)));
  }
  await logActivity(userId, 'review-replied', `Replied to ${updated.rating}★ from ${updated.customer}`, {});
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
  const [leads, jobs, reviews, customers] = await Promise.all([
    listLeads(userId),
    listJobs(userId),
    listReviews(userId),
    listCustomers(userId),
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

  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.status === 'completed' || l.status === 'booked').length;
  const leadConversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return {
    revenueMTD,
    jobsBooked,
    pipelineValue,
    rating,
    reviewCount: reviews.length,
    customerCount: customers.length,
    leadConversionRate,
  };
}

// ─── GLOBAL SEARCH ───────────────────────────
export async function globalSearch(userId: string, query: string) {
  if (!query || query.length < 2) return { leads: [], customers: [], jobs: [] };
  const q = query.toLowerCase();
  const [leads, customers, jobs] = await Promise.all([
    listLeads(userId),
    listCustomers(userId),
    listJobs(userId),
  ]);
  return {
    leads: leads.filter((l) =>
      `${l.name} ${l.address || ''} ${l.notes || ''} ${l.email || ''} ${l.phone || ''}`.toLowerCase().includes(q)
    ).slice(0, 10),
    customers: customers.filter((c) =>
      `${c.name} ${c.address || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase().includes(q)
    ).slice(0, 10),
    jobs: jobs.filter((j) =>
      `${j.customerName} ${j.address || ''} ${j.notes || ''}`.toLowerCase().includes(q)
    ).slice(0, 10),
  };
}

// ─── DEMO SEED ───────────────────────────────
export async function seedDemo(userId: string): Promise<void> {
  const leadData = [
    { name: 'Johnson Residence', status: 'new' as const, type: 'lawn' as const, value: 280, address: '1421 Oak St, Toledo, OH', notes: 'Bi-weekly mowing requested.', source: 'Google Search' },
    { name: 'Baker — Furnace svc', status: 'new' as const, type: 'hvac' as const, value: 950, address: '88 Maple Ave, Maumee, OH', notes: 'Furnace not igniting on cold mornings.', source: 'Referral' },
    { name: 'Holt Property', status: 'new' as const, type: 'lawn' as const, value: 420, address: '506 Elm, Sylvania, OH', notes: 'Spring cleanup + weekly mow.', source: 'Yard Sign' },
    { name: 'Williams Estate', status: 'quoted' as const, type: 'plumb' as const, value: 1200, address: '92 Birch, Perrysburg, OH', notes: 'Master bath remodel piping.', source: 'Website' },
    { name: 'Monroe Duplex', status: 'quoted' as const, type: 'lawn' as const, value: 160, address: '12 N River, Monroe, MI', notes: 'Both units, weekly.', source: 'Facebook' },
    { name: 'Perrysburg HVAC', status: 'booked' as const, type: 'hvac' as const, value: 2400, address: '1700 Louisiana Ave, Perrysburg, OH', source: 'Repeat Customer' },
    { name: 'Smith — weekly', status: 'booked' as const, type: 'lawn' as const, value: 340, address: '55 Hill Dr, Toledo, OH', source: 'Repeat Customer' },
    { name: 'Davis Acreage', status: 'completed' as const, type: 'lawn' as const, value: 580, address: '901 Country Rd, Sylvania, OH', source: 'Referral' },
  ];

  for (const l of leadData) {
    await createLead({
      userId,
      ...l,
      phone: '(419) 555-' + Math.floor(1000 + Math.random() * 9000),
    });
  }

  await createCustomer({
    userId,
    name: 'Smith Family',
    phone: '(419) 555-2103',
    email: 'smith@email.com',
    address: '55 Hill Dr, Toledo, OH',
    tags: ['repeat', 'weekly'],
  });
  await createCustomer({
    userId,
    name: 'Perrysburg HVAC LLC',
    phone: '(419) 555-7811',
    email: 'manager@perrysbgcommercial.com',
    address: '1700 Louisiana Ave, Perrysburg, OH',
    tags: ['commercial'],
  });

  const today = new Date();
  today.setHours(14, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await createJob({
    userId,
    customerName: 'Smith Family',
    scheduledFor: today.getTime(),
    durationMinutes: 60,
    status: 'scheduled',
    address: '55 Hill Dr, Toledo, OH',
    type: 'lawn',
    value: 65,
    notes: 'Weekly mow + edge',
    recurring: 'weekly',
  });
  await createJob({
    userId,
    customerName: 'Perrysburg HVAC',
    scheduledFor: tomorrow.getTime(),
    durationMinutes: 180,
    status: 'scheduled',
    address: '1700 Louisiana Ave, Perrysburg, OH',
    type: 'hvac',
    value: 2400,
    notes: 'Annual maintenance + filter replacement',
  });

  const reviewData = [
    { customer: 'Marcus T.', rating: 5, text: 'Fast and professional. Will use again.', source: 'google' as const, reply: 'Thanks Marcus! Glad we could fit your schedule.', repliedAt: Date.now() - 1000 * 60 * 14 },
    { customer: 'Denise K.', rating: 5, text: 'Best lawn care I\'ve used in 10 years. They show up when they say they will.', source: 'google' as const, reply: 'Means a lot, Denise. See you next visit.', repliedAt: Date.now() - 1000 * 60 * 60 * 8 },
    { customer: 'Ray J.', rating: 5, text: 'Hired them for HVAC service — quick, honest, fair pricing.', source: 'google' as const },
    { customer: 'Kim P.', rating: 4, text: 'Good work but ran a bit late. Otherwise no complaints.', source: 'google' as const },
  ];

  for (const r of reviewData) {
    await createReview({ userId, ...r });
  }

  await logAI(userId, { type: 'quote', summary: 'Quote drafted & sent to Johnson Residence — $280/mo recurring' });
  await logAI(userId, { type: 'review-reply', summary: 'Replied to ★★★★★ from Marcus T.' });
  await logAI(userId, { type: 'follow-up', summary: 'Day-3 follow-up sent to Williams Estate' });
}
