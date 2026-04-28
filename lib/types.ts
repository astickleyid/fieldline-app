export type LeadStatus = 'new' | 'quoted' | 'booked' | 'completed' | 'lost';
export type JobType = 'lawn' | 'hvac' | 'plumb' | 'other';
export type ActivityType =
  | 'lead-created'
  | 'lead-status-changed'
  | 'note-added'
  | 'quote-generated'
  | 'quote-sent'
  | 'job-scheduled'
  | 'job-completed'
  | 'invoice-sent'
  | 'invoice-paid'
  | 'sms-sent'
  | 'email-sent'
  | 'review-received'
  | 'review-replied';

export interface User {
  id: string;
  email: string;
  businessName: string;
  trade: JobType;
  phone?: string;
  voice?: string;
  createdAt: number;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tags?: string[];
  notes?: string;
  totalSpent: number;
  jobCount: number;
  firstSeenAt: number;
  lastJobAt?: number;
  portalToken?: string;
  createdAt: number;
}

export interface Lead {
  id: string;
  userId: string;
  customerId?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  status: LeadStatus;
  type: JobType;
  value: number;
  notes?: string;
  source?: string;
  tags?: string[];
  quote?: string;
  quoteGeneratedAt?: number;
  quoteAcceptedAt?: number;
  quoteAcceptToken?: string;
  aiScore?: number;
  aiScoreReasoning?: string;
  aiScoredAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Job {
  id: string;
  userId: string;
  leadId?: string;
  customerId?: string;
  customerName: string;
  scheduledFor: number;
  durationMinutes: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  address?: string;
  type: JobType;
  notes?: string;
  value: number;
  recurring?: 'weekly' | 'biweekly' | 'monthly' | null;
  parentJobId?: string;
  createdAt: number;
}

export interface Invoice {
  id: string;
  userId: string;
  jobId?: string;
  leadId?: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  lineItems: { description: string; amount: number }[];
  dueDate?: number;
  sentAt?: number;
  paidAt?: number;
  publicToken: string; // For shareable customer-facing link
  createdAt: number;
}

export interface Review {
  id: string;
  userId: string;
  customer: string;
  rating: number;
  text: string;
  reply?: string;
  repliedAt?: number;
  source: 'google' | 'fieldline' | 'other';
  createdAt: number;
}

export interface Activity {
  id: string;
  userId: string;
  leadId?: string;
  customerId?: string;
  jobId?: string;
  type: ActivityType;
  message: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface AILogEntry {
  id: string;
  type: 'quote' | 'review-reply' | 'follow-up' | 'lead-scoring' | 'briefing' | 'pricing';
  summary: string;
  timestamp: number;
}

export interface Briefing {
  text: string;
  generatedAt: number;
  date: string; // YYYY-MM-DD
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  notes?: string;
  done: boolean;
  dueAt?: number;
  priority: 'low' | 'normal' | 'high';
  leadId?: string;
  customerId?: string;
  jobId?: string;
  createdAt: number;
  completedAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'stale-lead' | 'overdue-invoice' | 'new-review' | 'quote-accepted' | 'job-tomorrow' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: number;
}

export interface EmailTemplate {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  category: 'quote' | 'follow-up' | 'invoice' | 'thank-you' | 'general';
  createdAt: number;
}

export interface JobPhoto {
  id: string;
  jobId: string;
  userId: string;
  type: 'before' | 'after' | 'reference';
  dataUrl: string; // base64
  caption?: string;
  uploadedAt: number;
}

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  trigger: 'lead-status-changed' | 'job-completed' | 'invoice-overdue' | 'lead-stale';
  conditions: { from?: string; to?: string; daysIdle?: number };
  action: 'create-task' | 'send-notification' | 'auto-invoice' | 'add-tag';
  actionConfig: Record<string, any>;
  enabled: boolean;
  lastRunAt?: number;
  runCount: number;
  createdAt: number;
}

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  resource: 'leads' | 'customers' | 'invoices' | 'jobs';
  filters: Record<string, any>;
  sortBy?: string;
  createdAt: number;
}

export interface WorkflowRule {
  id: string;
  userId: string;
  name: string;
  trigger: 'lead-status-changed' | 'quote-generated' | 'job-scheduled' | 'job-completed';
  triggerCondition?: { from?: string; to?: string };
  action: 'create-followup-task' | 'send-notification' | 'auto-invoice' | 'tag-lead';
  actionConfig?: Record<string, any>;
  enabled: boolean;
  createdAt: number;
}

export interface Stats {
  revenueMTD: number;
  jobsBooked: number;
  pipelineValue: number;
  rating: number;
  reviewCount: number;
  customerCount: number;
  leadConversionRate: number;
}
