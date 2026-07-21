import { redis } from './redis';
import { Lead, Job, Review, AILogEntry, User, Stats, Customer, Invoice, Activity, ActivityType, JobType } from './types';

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

export async function getCustomerByPortalToken(token: string): Promise<import('./types').Customer | null> {
  const customerId = (await redis.get(`portal:${token}`)) as string | null;
  if (!customerId) return null;
  return getCustomer(customerId);
}

export async function ensureCustomerPortalToken(customerId: string): Promise<string> {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error('Customer not found');
  if ((customer as any).portalToken) return (customer as any).portalToken;
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  await redis.set(`portal:${token}`, customerId);
  await updateCustomer(customerId, { ...(customer as any), portalToken: token } as any);
  return token;
}

// Find all jobs and invoices for a customer (used by portal)
export async function getCustomerActivity(customerId: string): Promise<{ jobs: Job[]; invoices: import('./types').Invoice[] }> {
  const customer = await getCustomer(customerId);
  if (!customer) return { jobs: [], invoices: [] };
  const [allJobs, allInvoices] = await Promise.all([
    listJobs(customer.userId),
    listInvoices(customer.userId),
  ]);
  return {
    jobs: allJobs.filter((j) => j.customerId === customerId),
    invoices: allInvoices.filter((i) => i.customerId === customerId),
  };
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
    // Fire automations (await so it actually runs in serverless)
    try {
      await fireAutomations(existing.userId, 'lead-status-changed', {
        lead: updated,
        from: existing.status,
        to: patch.status,
      });
    } catch (e) {
      console.error('automation error', e);
    }
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
    // Fire automations (await so it actually runs in serverless)
    try {
      await fireAutomations(existing.userId, 'job-completed', { job: updated });
    } catch (e) {
      console.error('automation error', e);
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

// ─── TASKS ───────────────────────────────────
export async function listTasks(userId: string): Promise<import('./types').Task[]> {
  const ids = (await redis.zrange(`tasks:${userId}`, 0, -1, { rev: true })) as string[];
  if (!ids.length) return [];
  const items = await Promise.all(ids.map((id) => redis.get(`task:${id}`)));
  return items.filter(Boolean) as import('./types').Task[];
}

export async function getTask(taskId: string): Promise<import('./types').Task | null> {
  return (await redis.get(`task:${taskId}`)) as import('./types').Task | null;
}

export async function createTask(data: Omit<import('./types').Task, 'id' | 'createdAt' | 'done'>): Promise<import('./types').Task> {
  const id = newId('task');
  const t: import('./types').Task = { ...data, id, done: false, createdAt: Date.now() };
  await redis.set(`task:${id}`, t);
  await redis.zadd(`tasks:${data.userId}`, { score: Date.now(), member: id });
  return t;
}

export async function updateTask(taskId: string, patch: Partial<import('./types').Task>): Promise<import('./types').Task | null> {
  const existing = await getTask(taskId);
  if (!existing) return null;
  const updated: import('./types').Task = { ...existing, ...patch };
  if (patch.done && !existing.done) updated.completedAt = Date.now();
  await redis.set(`task:${taskId}`, updated);
  return updated;
}

export async function deleteTask(taskId: string, userId: string): Promise<void> {
  await redis.del(`task:${taskId}`);
  await redis.zrem(`tasks:${userId}`, taskId);
}

// ─── NOTIFICATIONS ───────────────────────────
export async function listNotifications(userId: string, limit = 50): Promise<import('./types').Notification[]> {
  const raw = (await redis.lrange(`notif:${userId}`, 0, limit - 1)) as any[];
  return raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r)) as import('./types').Notification[];
}

export async function createNotification(data: Omit<import('./types').Notification, 'id' | 'createdAt' | 'read'>): Promise<import('./types').Notification> {
  const n: import('./types').Notification = {
    ...data,
    id: newId('notif'),
    read: false,
    createdAt: Date.now(),
  };
  await redis.lpush(`notif:${data.userId}`, JSON.stringify(n));
  await redis.ltrim(`notif:${data.userId}`, 0, 199);
  return n;
}

export async function markNotificationRead(userId: string, notifId: string): Promise<void> {
  const all = await listNotifications(userId, 200);
  const idx = all.findIndex((n) => n.id === notifId);
  if (idx === -1) return;
  all[idx] = { ...all[idx], read: true };
  await redis.del(`notif:${userId}`);
  if (all.length) await redis.rpush(`notif:${userId}`, ...all.map((n) => JSON.stringify(n)));
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const all = await listNotifications(userId, 200);
  const updated = all.map((n) => ({ ...n, read: true }));
  await redis.del(`notif:${userId}`);
  if (updated.length) await redis.rpush(`notif:${userId}`, ...updated.map((n) => JSON.stringify(n)));
}

// Auto-generate notifications based on state
export async function refreshNotifications(userId: string): Promise<void> {
  const [leads, invoices, reviews, jobs] = await Promise.all([
    listLeads(userId),
    listInvoices(userId),
    listReviews(userId),
    listJobs(userId),
  ]);
  const dayMs = 86_400_000;
  const existing = await listNotifications(userId, 200);
  const has = (key: string) => existing.some((n) => n.id.includes(key) || n.message.includes(key));

  // Fire lead-stale automations (never fired automatically before this)
  const rules = await listAutomationRules(userId);
  const staleRules = rules.filter((r) => r.enabled && r.trigger === 'lead-stale');
  for (const rule of staleRules) {
    const minDays = Number(rule.conditions.daysIdle ?? 3);
    const stale = leads.filter((l) =>
      (l.status === 'new' || l.status === 'quoted') &&
      Date.now() - l.updatedAt > minDays * dayMs
    );
    for (const lead of stale) {
      const fireKey = `automation:stale:${rule.id}:${lead.id}`;
      const lastFiredKey = `lastfire:${rule.id}:${lead.id}`;
      const lastFired = await redis.get(lastFiredKey);
      if (lastFired && Date.now() - Number(lastFired) < 7 * dayMs) continue; // throttle to weekly
      try {
        if (rule.action === 'create-task') {
          const title = (rule.actionConfig.title || 'Follow up').replace('{{name}}', lead.name);
          await createTask({
            userId, title,
            notes: rule.actionConfig.notes,
            priority: rule.actionConfig.priority || 'normal',
            leadId: lead.id,
          });
        } else if (rule.action === 'send-notification') {
          await createNotification({
            userId, type: 'system',
            title: rule.actionConfig.title || 'Stale lead',
            message: `${lead.name}: ${rule.actionConfig.message || `idle ${minDays}+ days`}`,
            link: `/leads/${lead.id}`,
          });
        } else if (rule.action === 'add-tag' && rule.actionConfig.tag) {
          const tags = [...(lead.tags || []), rule.actionConfig.tag];
          await updateLead(lead.id, { tags });
        }
        await redis.set(lastFiredKey, Date.now().toString());
        await updateAutomationRule(rule.id, { runCount: rule.runCount + 1, lastRunAt: Date.now() });
      } catch (e) { console.error('stale rule failed', e); }
    }
  }

  // Mark invoices overdue if past due date
  for (const inv of invoices) {
    if (inv.status === 'sent' && inv.dueDate && Date.now() > inv.dueDate) {
      await updateInvoice(inv.id, { status: 'overdue' });
      inv.status = 'overdue'; // reflect in this snapshot
    }
  }

  // Fire invoice-overdue automations
  const overdueRules = rules.filter((r) => r.enabled && r.trigger === 'invoice-overdue');
  for (const rule of overdueRules) {
    for (const inv of invoices.filter((i) => i.status === 'overdue')) {
      const lastFiredKey = `lastfire:${rule.id}:${inv.id}`;
      const lastFired = await redis.get(lastFiredKey);
      if (lastFired && Date.now() - Number(lastFired) < 3 * dayMs) continue; // every 3 days
      try {
        if (rule.action === 'send-notification') {
          await createNotification({
            userId, type: 'overdue-invoice',
            title: rule.actionConfig.title || 'Invoice still overdue',
            message: `${inv.customerName}: $${inv.amount}`,
            link: '/invoices',
          });
        } else if (rule.action === 'create-task') {
          await createTask({
            userId,
            title: (rule.actionConfig.title || 'Chase overdue invoice').replace('{{name}}', inv.customerName),
            priority: 'high',
            customerId: inv.customerId,
          });
        }
        await redis.set(lastFiredKey, Date.now().toString());
        await updateAutomationRule(rule.id, { runCount: rule.runCount + 1, lastRunAt: Date.now() });
      } catch (e) { console.error('overdue rule failed', e); }
    }
  }

  // Stale leads
  for (const l of leads.filter((l) => (l.status === 'new' || l.status === 'quoted') && Date.now() - l.updatedAt > 7 * dayMs)) {
    if (!has(`stale:${l.id}`)) {
      await createNotification({
        userId, type: 'stale-lead',
        title: 'Stale lead',
        message: `${l.name} has been ${l.status} for over 7 days`,
        link: `/leads/${l.id}`,
      });
    }
  }
  // Overdue invoices
  for (const i of invoices.filter((i) => i.status === 'overdue')) {
    if (!has(`overdue:${i.id}`)) {
      await createNotification({
        userId, type: 'overdue-invoice',
        title: 'Invoice overdue',
        message: `${i.customerName}: $${i.amount}`,
        link: `/invoices`,
      });
    }
  }
  // Tomorrow's jobs
  const tomorrow = new Date(); tomorrow.setHours(0,0,0,0); tomorrow.setDate(tomorrow.getDate()+1);
  const dayAfter = new Date(tomorrow); dayAfter.setDate(tomorrow.getDate()+1);
  for (const j of jobs.filter((j) => j.scheduledFor >= tomorrow.getTime() && j.scheduledFor < dayAfter.getTime() && j.status === 'scheduled')) {
    if (!has(`tmrw:${j.id}`)) {
      await createNotification({
        userId, type: 'job-tomorrow',
        title: 'Job tomorrow',
        message: `${j.customerName} at ${new Date(j.scheduledFor).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`,
        link: `/calendar`,
      });
    }
  }
}

// ─── EMAIL TEMPLATES ─────────────────────────
export async function listEmailTemplates(userId: string): Promise<import('./types').EmailTemplate[]> {
  const ids = (await redis.zrange(`templates:${userId}`, 0, -1, { rev: true })) as string[];
  if (!ids.length) return [];
  const items = await Promise.all(ids.map((id) => redis.get(`template:${id}`)));
  return items.filter(Boolean) as import('./types').EmailTemplate[];
}

export async function createEmailTemplate(data: Omit<import('./types').EmailTemplate, 'id' | 'createdAt'>): Promise<import('./types').EmailTemplate> {
  const id = newId('tpl');
  const t: import('./types').EmailTemplate = { ...data, id, createdAt: Date.now() };
  await redis.set(`template:${id}`, t);
  await redis.zadd(`templates:${data.userId}`, { score: Date.now(), member: id });
  return t;
}

export async function updateEmailTemplate(id: string, patch: Partial<import('./types').EmailTemplate>): Promise<import('./types').EmailTemplate | null> {
  const existing = (await redis.get(`template:${id}`)) as import('./types').EmailTemplate | null;
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await redis.set(`template:${id}`, updated);
  return updated;
}

export async function deleteEmailTemplate(id: string, userId: string): Promise<void> {
  await redis.del(`template:${id}`);
  await redis.zrem(`templates:${userId}`, id);
}

// ─── JOB PHOTOS ──────────────────────────────
export async function listJobPhotos(jobId: string): Promise<import('./types').JobPhoto[]> {
  const ids = (await redis.zrange(`photos:${jobId}`, 0, -1)) as string[];
  if (!ids.length) return [];
  const items = await Promise.all(ids.map((id) => redis.get(`photo:${id}`)));
  return items.filter(Boolean) as import('./types').JobPhoto[];
}

export async function addJobPhoto(data: Omit<import('./types').JobPhoto, 'id' | 'uploadedAt'>): Promise<import('./types').JobPhoto> {
  const id = newId('ph');
  const p: import('./types').JobPhoto = { ...data, id, uploadedAt: Date.now() };
  await redis.set(`photo:${id}`, p);
  await redis.zadd(`photos:${data.jobId}`, { score: Date.now(), member: id });
  return p;
}

export async function deleteJobPhoto(photoId: string, jobId: string): Promise<void> {
  await redis.del(`photo:${photoId}`);
  await redis.zrem(`photos:${jobId}`, photoId);
}

// ─── AUTOMATION RULES ────────────────────────
export async function listAutomationRules(userId: string): Promise<import('./types').AutomationRule[]> {
  const ids = (await redis.zrange(`rules:${userId}`, 0, -1, { rev: true })) as string[];
  if (!ids.length) return [];
  const items = await Promise.all(ids.map((id) => redis.get(`rule:${id}`)));
  return items.filter(Boolean) as import('./types').AutomationRule[];
}

export async function createAutomationRule(data: Omit<import('./types').AutomationRule, 'id' | 'createdAt' | 'runCount'>): Promise<import('./types').AutomationRule> {
  const id = newId('rule');
  const r: import('./types').AutomationRule = { ...data, id, runCount: 0, createdAt: Date.now() };
  await redis.set(`rule:${id}`, r);
  await redis.zadd(`rules:${data.userId}`, { score: Date.now(), member: id });
  return r;
}

export async function updateAutomationRule(id: string, patch: Partial<import('./types').AutomationRule>): Promise<import('./types').AutomationRule | null> {
  const existing = (await redis.get(`rule:${id}`)) as import('./types').AutomationRule | null;
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await redis.set(`rule:${id}`, updated);
  return updated;
}

export async function deleteAutomationRule(id: string, userId: string): Promise<void> {
  await redis.del(`rule:${id}`);
  await redis.zrem(`rules:${userId}`, id);
}

// Run automation rules when an event happens
export async function fireAutomations(
  userId: string,
  event: import('./types').AutomationRule['trigger'],
  context: { lead?: Lead; job?: Job; invoice?: any; from?: string; to?: string }
): Promise<void> {
  const rules = await listAutomationRules(userId);
  for (const r of rules.filter((r) => r.enabled && r.trigger === event)) {
    let shouldRun = true;
    if (event === 'lead-status-changed') {
      if (r.conditions.from && r.conditions.from !== context.from) shouldRun = false;
      if (r.conditions.to && r.conditions.to !== context.to) shouldRun = false;
    }
    if (!shouldRun) continue;

    try {
      if (r.action === 'create-task') {
        const title = (r.actionConfig.title || 'Follow up').replace('{{name}}', context.lead?.name || context.job?.customerName || '');
        const dueOffsetDays = Number(r.actionConfig.dueDays) || 0;
        await createTask({
          userId,
          title,
          notes: r.actionConfig.notes,
          priority: r.actionConfig.priority || 'normal',
          dueAt: dueOffsetDays > 0 ? Date.now() + dueOffsetDays * 86_400_000 : undefined,
          leadId: context.lead?.id,
          jobId: context.job?.id,
        });
      } else if (r.action === 'send-notification') {
        const title = (r.actionConfig.title || `Rule fired: ${r.name}`).slice(0, 80);
        const message = (r.actionConfig.message || 'Automation triggered').slice(0, 200);
        await createNotification({
          userId,
          type: 'system',
          title,
          message,
          link: context.lead ? `/leads/${context.lead.id}` : undefined,
        });
      } else if (r.action === 'auto-invoice' && context.job) {
        const customerName = context.job.customerName;
        await createInvoice({
          userId,
          jobId: context.job.id,
          customerId: context.job.customerId,
          customerName,
          amount: context.job.value,
          status: 'draft',
          lineItems: [{ description: context.job.notes || `${context.job.type} services`, amount: context.job.value }],
        });
      } else if (r.action === 'add-tag' && context.lead && r.actionConfig.tag) {
        const tags = [...(context.lead.tags || []), r.actionConfig.tag];
        await updateLead(context.lead.id, { tags });
      }

      // Update rule stats
      await updateAutomationRule(r.id, { runCount: r.runCount + 1, lastRunAt: Date.now() });
    } catch (e) {
      console.error('Automation rule failed:', e);
    }
  }
}

// ─── SAVED VIEWS ─────────────────────────────
export async function listSavedViews(userId: string, resource?: string): Promise<import('./types').SavedView[]> {
  const ids = (await redis.zrange(`views:${userId}`, 0, -1)) as string[];
  if (!ids.length) return [];
  const items = await Promise.all(ids.map((id) => redis.get(`view:${id}`)));
  let views = items.filter(Boolean) as import('./types').SavedView[];
  if (resource) views = views.filter((v) => v.resource === resource);
  return views;
}

export async function createSavedView(data: Omit<import('./types').SavedView, 'id' | 'createdAt'>): Promise<import('./types').SavedView> {
  const id = newId('view');
  const v: import('./types').SavedView = { ...data, id, createdAt: Date.now() };
  await redis.set(`view:${id}`, v);
  await redis.zadd(`views:${data.userId}`, { score: Date.now(), member: id });
  return v;
}

export async function deleteSavedView(id: string, userId: string): Promise<void> {
  await redis.del(`view:${id}`);
  await redis.zrem(`views:${userId}`, id);
}

// ─── DEMO SEED ───────────────────────────────
export async function seedDemo(userId: string, trade: JobType = 'other'): Promise<void> {
  const t: JobType = (['lawn', 'hvac', 'plumb', 'other'] as const).includes(trade as any) ? trade : 'other';

  const SEEDS: Record<JobType, {
    leads: Array<{ name: string; status: 'new' | 'quoted' | 'booked' | 'completed'; value: number; address: string; notes?: string; source: string }>;
    customers: Array<{ name: string; phone: string; email: string; address: string; tags: string[] }>;
    jobs: Array<{ customerName: string; durationMinutes: number; address: string; value: number; notes: string; recurring?: 'weekly' }>;
    reviews: Array<{ customer: string; rating: number; text: string; reply?: string; repliedAt?: number }>;
    aiLog: Array<{ type: 'quote' | 'review-reply' | 'follow-up'; summary: string }>;
  }> = {
    hvac: {
      leads: [
        { name: 'Baker — Furnace svc', status: 'new', value: 950, address: '88 Maple Ave, Maumee, OH', notes: 'Furnace not igniting on cold mornings.', source: 'Referral' },
        { name: 'Kowalski — AC out', status: 'new', value: 480, address: '1421 Oak St, Toledo, OH', notes: 'No cooling, unit runs but blows warm.', source: 'Google Search' },
        { name: 'Reyes — new install quote', status: 'new', value: 6800, address: '506 Elm, Sylvania, OH', notes: 'Replacing 18yr old system, wants high-efficiency.', source: 'Website' },
        { name: 'Williams Estate', status: 'quoted', value: 3200, address: '92 Birch, Perrysburg, OH', notes: 'Ductwork rebalance + zoning.', source: 'Website' },
        { name: 'Monroe Duplex', status: 'quoted', value: 1150, address: '12 N River, Monroe, MI', notes: 'Two furnaces, annual service contract.', source: 'Facebook' },
        { name: 'Perrysburg Commercial', status: 'booked', value: 2400, address: '1700 Louisiana Ave, Perrysburg, OH', source: 'Repeat Customer' },
        { name: 'Nowak — maintenance plan', status: 'booked', value: 340, address: '55 Hill Dr, Toledo, OH', source: 'Repeat Customer' },
        { name: 'Delgado — heat pump', status: 'completed', value: 5800, address: '901 Country Rd, Sylvania, OH', source: 'Referral' },
      ],
      customers: [
        { name: 'Nowak Family', phone: '(419) 555-2103', email: 'nowak@email.com', address: '55 Hill Dr, Toledo, OH', tags: ['maintenance plan', 'repeat'] },
        { name: 'Perrysburg Commercial LLC', phone: '(419) 555-7811', email: 'manager@perrysbgcommercial.com', address: '1700 Louisiana Ave, Perrysburg, OH', tags: ['commercial'] },
      ],
      jobs: [
        { customerName: 'Nowak Family', durationMinutes: 90, address: '55 Hill Dr, Toledo, OH', value: 165, notes: 'Seasonal tune-up + filter change' },
        { customerName: 'Perrysburg Commercial', durationMinutes: 180, address: '1700 Louisiana Ave, Perrysburg, OH', value: 2400, notes: 'Annual maintenance, 4 rooftop units' },
      ],
      reviews: [
        { customer: 'Marcus T.', rating: 5, text: 'Had heat back on the same evening. Fast and professional.', reply: 'Thanks Marcus! Glad we could get you warm again quickly.', repliedAt: Date.now() - 1000 * 60 * 14 },
        { customer: 'Denise K.', rating: 5, text: 'Best HVAC company I have used in 10 years. They show up when they say they will.', reply: 'Means a lot, Denise. See you at the next service.', repliedAt: Date.now() - 1000 * 60 * 60 * 8 },
        { customer: 'Ray J.', rating: 5, text: 'Quick, honest, fair pricing on our AC repair.' },
        { customer: 'Kim P.', rating: 4, text: 'Good work but ran a bit late. Otherwise no complaints.' },
      ],
      aiLog: [
        { type: 'quote', summary: 'Quote drafted & sent to Kowalski — $480 AC diagnostic + repair' },
        { type: 'review-reply', summary: 'Replied to ★★★★★ from Marcus T.' },
        { type: 'follow-up', summary: 'Day-3 follow-up sent to Williams Estate' },
      ],
    },
    plumb: {
      leads: [
        { name: 'Baker — water heater', status: 'new', value: 1450, address: '88 Maple Ave, Maumee, OH', notes: 'Leaking at base, 11yr old tank.', source: 'Referral' },
        { name: 'Kowalski — main drain', status: 'new', value: 380, address: '1421 Oak St, Toledo, OH', notes: 'Backing up into basement floor drain.', source: 'Google Search' },
        { name: 'Reyes — repipe quote', status: 'new', value: 7200, address: '506 Elm, Sylvania, OH', notes: 'Galvanized to PEX, 3 bed ranch.', source: 'Website' },
        { name: 'Williams Estate', status: 'quoted', value: 1200, address: '92 Birch, Perrysburg, OH', notes: 'Master bath remodel piping.', source: 'Website' },
        { name: 'Monroe Duplex', status: 'quoted', value: 640, address: '12 N River, Monroe, MI', notes: 'Both units, fixture replacement.', source: 'Facebook' },
        { name: 'Perrysburg Commercial', status: 'booked', value: 2400, address: '1700 Louisiana Ave, Perrysburg, OH', source: 'Repeat Customer' },
        { name: 'Nowak — sump pump', status: 'booked', value: 720, address: '55 Hill Dr, Toledo, OH', source: 'Repeat Customer' },
        { name: 'Delgado — sewer line', status: 'completed', value: 4900, address: '901 Country Rd, Sylvania, OH', source: 'Referral' },
      ],
      customers: [
        { name: 'Nowak Family', phone: '(419) 555-2103', email: 'nowak@email.com', address: '55 Hill Dr, Toledo, OH', tags: ['repeat'] },
        { name: 'Perrysburg Commercial LLC', phone: '(419) 555-7811', email: 'manager@perrysbgcommercial.com', address: '1700 Louisiana Ave, Perrysburg, OH', tags: ['commercial'] },
      ],
      jobs: [
        { customerName: 'Nowak Family', durationMinutes: 120, address: '55 Hill Dr, Toledo, OH', value: 720, notes: 'Sump pump replacement + check valve' },
        { customerName: 'Perrysburg Commercial', durationMinutes: 180, address: '1700 Louisiana Ave, Perrysburg, OH', value: 2400, notes: 'Backflow testing + fixture service' },
      ],
      reviews: [
        { customer: 'Marcus T.', rating: 5, text: 'Stopped the leak same day. Fast and professional.', reply: 'Thanks Marcus! Glad we caught it before any real damage.', repliedAt: Date.now() - 1000 * 60 * 14 },
        { customer: 'Denise K.', rating: 5, text: 'Best plumber I have used in 10 years. They show up when they say they will.', reply: 'Means a lot, Denise. Call us anytime.', repliedAt: Date.now() - 1000 * 60 * 60 * 8 },
        { customer: 'Ray J.', rating: 5, text: 'Quick, honest, fair pricing on our drain clog.' },
        { customer: 'Kim P.', rating: 4, text: 'Good work but ran a bit late. Otherwise no complaints.' },
      ],
      aiLog: [
        { type: 'quote', summary: 'Quote drafted & sent to Baker — $1,450 water heater replacement' },
        { type: 'review-reply', summary: 'Replied to ★★★★★ from Marcus T.' },
        { type: 'follow-up', summary: 'Day-3 follow-up sent to Williams Estate' },
      ],
    },
    lawn: {
      leads: [
        { name: 'Johnson Residence', status: 'new', value: 280, address: '1421 Oak St, Toledo, OH', notes: 'Bi-weekly mowing requested.', source: 'Google Search' },
        { name: 'Holt Property', status: 'new', value: 420, address: '506 Elm, Sylvania, OH', notes: 'Spring cleanup + weekly mow.', source: 'Yard Sign' },
        { name: 'Baker — landscape beds', status: 'new', value: 1150, address: '88 Maple Ave, Maumee, OH', notes: 'Mulch + shrub trim, front and side.', source: 'Referral' },
        { name: 'Williams Estate', status: 'quoted', value: 1200, address: '92 Birch, Perrysburg, OH', notes: 'Full season contract, 1.2 acres.', source: 'Website' },
        { name: 'Monroe Duplex', status: 'quoted', value: 160, address: '12 N River, Monroe, MI', notes: 'Both units, weekly.', source: 'Facebook' },
        { name: 'Perrysburg Commercial', status: 'booked', value: 2400, address: '1700 Louisiana Ave, Perrysburg, OH', source: 'Repeat Customer' },
        { name: 'Smith — weekly', status: 'booked', value: 340, address: '55 Hill Dr, Toledo, OH', source: 'Repeat Customer' },
        { name: 'Davis Acreage', status: 'completed', value: 580, address: '901 Country Rd, Sylvania, OH', source: 'Referral' },
      ],
      customers: [
        { name: 'Smith Family', phone: '(419) 555-2103', email: 'smith@email.com', address: '55 Hill Dr, Toledo, OH', tags: ['repeat', 'weekly'] },
        { name: 'Perrysburg Commercial LLC', phone: '(419) 555-7811', email: 'manager@perrysbgcommercial.com', address: '1700 Louisiana Ave, Perrysburg, OH', tags: ['commercial'] },
      ],
      jobs: [
        { customerName: 'Smith Family', durationMinutes: 60, address: '55 Hill Dr, Toledo, OH', value: 65, notes: 'Weekly mow + edge', recurring: 'weekly' },
        { customerName: 'Perrysburg Commercial', durationMinutes: 180, address: '1700 Louisiana Ave, Perrysburg, OH', value: 2400, notes: 'Grounds maintenance, full property' },
      ],
      reviews: [
        { customer: 'Marcus T.', rating: 5, text: 'Fast and professional. Yard looks sharp every week.', reply: 'Thanks Marcus! Glad we could fit your schedule.', repliedAt: Date.now() - 1000 * 60 * 14 },
        { customer: 'Denise K.', rating: 5, text: 'Best lawn care I have used in 10 years. They show up when they say they will.', reply: 'Means a lot, Denise. See you next visit.', repliedAt: Date.now() - 1000 * 60 * 60 * 8 },
        { customer: 'Ray J.', rating: 5, text: 'Quick, honest, fair pricing on our spring cleanup.' },
        { customer: 'Kim P.', rating: 4, text: 'Good work but ran a bit late. Otherwise no complaints.' },
      ],
      aiLog: [
        { type: 'quote', summary: 'Quote drafted & sent to Johnson Residence — $280/mo recurring' },
        { type: 'review-reply', summary: 'Replied to ★★★★★ from Marcus T.' },
        { type: 'follow-up', summary: 'Day-3 follow-up sent to Williams Estate' },
      ],
    },
    other: {
      leads: [
        { name: 'Baker Residence', status: 'new', value: 950, address: '88 Maple Ave, Maumee, OH', notes: 'Initial service request, wants a callback.', source: 'Referral' },
        { name: 'Kowalski Residence', status: 'new', value: 480, address: '1421 Oak St, Toledo, OH', notes: 'Repair estimate requested.', source: 'Google Search' },
        { name: 'Reyes Property', status: 'new', value: 2200, address: '506 Elm, Sylvania, OH', notes: 'Larger project, wants written quote.', source: 'Website' },
        { name: 'Williams Estate', status: 'quoted', value: 1200, address: '92 Birch, Perrysburg, OH', notes: 'Quote sent, awaiting decision.', source: 'Website' },
        { name: 'Monroe Duplex', status: 'quoted', value: 640, address: '12 N River, Monroe, MI', notes: 'Both units.', source: 'Facebook' },
        { name: 'Perrysburg Commercial', status: 'booked', value: 2400, address: '1700 Louisiana Ave, Perrysburg, OH', source: 'Repeat Customer' },
        { name: 'Nowak — service', status: 'booked', value: 340, address: '55 Hill Dr, Toledo, OH', source: 'Repeat Customer' },
        { name: 'Delgado Property', status: 'completed', value: 1800, address: '901 Country Rd, Sylvania, OH', source: 'Referral' },
      ],
      customers: [
        { name: 'Nowak Family', phone: '(419) 555-2103', email: 'nowak@email.com', address: '55 Hill Dr, Toledo, OH', tags: ['repeat'] },
        { name: 'Perrysburg Commercial LLC', phone: '(419) 555-7811', email: 'manager@perrysbgcommercial.com', address: '1700 Louisiana Ave, Perrysburg, OH', tags: ['commercial'] },
      ],
      jobs: [
        { customerName: 'Nowak Family', durationMinutes: 90, address: '55 Hill Dr, Toledo, OH', value: 340, notes: 'Scheduled service call' },
        { customerName: 'Perrysburg Commercial', durationMinutes: 180, address: '1700 Louisiana Ave, Perrysburg, OH', value: 2400, notes: 'Contracted service visit' },
      ],
      reviews: [
        { customer: 'Marcus T.', rating: 5, text: 'Fast and professional. Will use again.', reply: 'Thanks Marcus! Glad we could fit your schedule.', repliedAt: Date.now() - 1000 * 60 * 14 },
        { customer: 'Denise K.', rating: 5, text: 'Best in the area. They show up when they say they will.', reply: 'Means a lot, Denise. See you next visit.', repliedAt: Date.now() - 1000 * 60 * 60 * 8 },
        { customer: 'Ray J.', rating: 5, text: 'Quick, honest, fair pricing.' },
        { customer: 'Kim P.', rating: 4, text: 'Good work but ran a bit late. Otherwise no complaints.' },
      ],
      aiLog: [
        { type: 'quote', summary: 'Quote drafted & sent to Baker Residence — $950' },
        { type: 'review-reply', summary: 'Replied to ★★★★★ from Marcus T.' },
        { type: 'follow-up', summary: 'Day-3 follow-up sent to Williams Estate' },
      ],
    },
  };

  const seed = SEEDS[t];

  for (const l of seed.leads) {
    await createLead({
      userId,
      name: l.name,
      status: l.status,
      type: t,
      value: l.value,
      address: l.address,
      notes: l.notes,
      source: l.source,
      phone: '(419) 555-' + Math.floor(1000 + Math.random() * 9000),
    });
  }

  for (const c of seed.customers) {
    await createCustomer({ userId, ...c });
  }

  const today = new Date();
  today.setHours(14, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const times = [today.getTime(), tomorrow.getTime()];

  for (let i = 0; i < seed.jobs.length; i++) {
    const j = seed.jobs[i];
    await createJob({
      userId,
      customerName: j.customerName,
      scheduledFor: times[i] ?? tomorrow.getTime(),
      durationMinutes: j.durationMinutes,
      status: 'scheduled',
      address: j.address,
      type: t,
      value: j.value,
      notes: j.notes,
      ...(j.recurring ? { recurring: j.recurring } : {}),
    });
  }

  for (const r of seed.reviews) {
    await createReview({ userId, ...r, source: 'google' as const });
  }

  for (const a of seed.aiLog) {
    await logAI(userId, a);
  }
}
