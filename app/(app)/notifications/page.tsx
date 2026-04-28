'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Notification = {
  id: string;
  type: 'stale-lead' | 'overdue-invoice' | 'new-review' | 'quote-accepted' | 'job-tomorrow' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: number;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { openSidebar } = useShell();

  useEffect(() => { load(); }, []);
  async function load() {
    // Refresh first to generate any new system notifications
    const res = await fetch('/api/notifications?refresh=1');
    const data = await res.json();
    setNotifications(data.notifications || []);
    setLoading(false);
  }

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.all(unread.map((n) => fetch(`/api/notifications/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    })));
  }

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <TopBar
        title="Notifications"
        subtitle={`${notifications.length} TOTAL · ${unreadCount} UNREAD`}
        onMenuClick={openSidebar}
        action={
          unreadCount > 0 ? (
            <button onClick={markAllRead} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
              Mark all read
            </button>
          ) : null
        }
      />

      <div className="border-b border-rule px-4 md:px-6 h-12 flex items-center gap-1 bg-ink/40">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded font-mono text-[10px] tracking-wider uppercase ${
              filter === f ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6 max-w-3xl">
        {loading ? (
          <div className="text-center py-12 text-paper-mute font-mono text-xs">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-ink-2 border border-dashed border-rule rounded-lg">
            <div className="text-paper-mute mb-2">{filter === 'unread' ? 'All caught up!' : 'No notifications yet'}</div>
            <div className="text-xs text-paper-dim">Notifications appear when leads go stale, invoices go overdue, jobs are coming up, and more.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => <NotificationRow key={n.id} notification={n} onRead={markRead}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const fmtDate = (t: number) => {
    const d = Date.now() - t;
    if (d < 60_000) return 'just now';
    if (d < 3_600_000) return Math.floor(d / 60_000) + 'm ago';
    if (d < 86_400_000) return Math.floor(d / 3_600_000) + 'h ago';
    return new Date(t).toLocaleDateString();
  };

  const colors: Record<string, string> = {
    'stale-lead': 'text-signal',
    'overdue-invoice': 'text-red-400',
    'new-review': 'text-yellow-400',
    'quote-accepted': 'text-acid',
    'job-tomorrow': 'text-blue-400',
    'system': 'text-paper-mute',
  };

  const icons: Record<string, string> = {
    'stale-lead': '⏱',
    'overdue-invoice': '⚠',
    'new-review': '★',
    'quote-accepted': '✓',
    'job-tomorrow': '▦',
    'system': '·',
  };

  const content = (
    <div className={`bg-ink-2 border rounded-lg p-4 hover:border-paper-dim transition-all flex items-start gap-3 ${
      notification.read ? 'border-rule opacity-60' : 'border-signal/30'
    }`}>
      <span className={`shrink-0 text-base mt-0.5 ${colors[notification.type] || 'text-paper-mute'}`}>{icons[notification.type] || '·'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-3">
          <div className="text-sm font-medium text-paper">{notification.title}</div>
          <div className="font-mono text-[10px] text-paper-dim shrink-0">{fmtDate(notification.createdAt)}</div>
        </div>
        <div className="text-xs text-paper-mute mt-1">{notification.message}</div>
      </div>
      {!notification.read && <span className="w-2 h-2 rounded-full bg-signal shrink-0 mt-2"/>}
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={() => !notification.read && onRead(notification.id)} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button onClick={() => !notification.read && onRead(notification.id)} className="w-full text-left">
      {content}
    </button>
  );
}
