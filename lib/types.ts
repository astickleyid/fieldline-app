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
  createdAt: number;
}

export interface Lead {
  id: string;
  userId: string;
  customerId?: string; // Linked when converted/repeat
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
  type: 'quote' | 'review-reply' | 'follow-up';
  summary: string;
  timestamp: number;
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
