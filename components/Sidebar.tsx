'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '◐' },
  { href: '/leads', label: 'Pipeline', icon: '▤' },
  { href: '/customers', label: 'Customers', icon: '◉' },
  { href: '/calendar', label: 'Schedule', icon: '▦' },
  { href: '/invoices', label: 'Invoices', icon: '$' },
  { href: '/reviews', label: 'Reviews', icon: '★' },
  { href: '/activity', label: 'Activity', icon: '↺' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar({
  businessName,
  open = false,
  onClose,
}: {
  businessName: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    onClose?.();
  }, [pathname]); // eslint-disable-line

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-ink/60 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={`
        w-56 border-r border-rule bg-ink-2 flex flex-col
        md:sticky md:top-0 md:h-screen md:translate-x-0
        fixed top-0 left-0 h-screen z-50 transition-transform
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-5 py-4 border-b border-rule">
          <div className="flex items-baseline gap-2">
            <span className="font-serif italic text-2xl tracking-tight">Fieldline</span>
            <span className="font-mono text-[9px] text-paper-dim tracking-wider">v0.5</span>
          </div>
          <div className="font-mono text-[10px] text-paper-mute tracking-wide mt-1 truncate" title={businessName}>
            {businessName}
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== '/dashboard' && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                  active
                    ? 'bg-paper text-ink font-medium'
                    : 'text-paper-mute hover:text-paper hover:bg-rule-2'
                }`}>
                <span className="font-mono text-[14px] w-4 text-center">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-rule">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse" style={{ boxShadow: '0 0 6px #C8FF3F' }}/>
            <span className="font-mono text-[10px] text-paper-mute tracking-wide">SYSTEM ONLINE</span>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 mt-1 text-[11px] text-paper-mute hover:text-signal font-mono tracking-wide transition-colors">
            → Log out
          </button>
        </div>
      </aside>
    </>
  );
}
