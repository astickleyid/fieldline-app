'use client';

import { useState, createContext, useContext } from 'react';
import Sidebar from './Sidebar';
import { ToastProvider } from './Toast';
import { ConfirmProvider } from './Confirm';

const ShellContext = createContext({ openSidebar: () => {} });

export function useShell() { return useContext(ShellContext); }

export default function AppShell({ businessName, children }: { businessName: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <ConfirmProvider>
      <ToastProvider>
        <ShellContext.Provider value={{ openSidebar: () => setOpen(true) }}>
          <div className="flex min-h-screen">
            <Sidebar businessName={businessName} open={open} onClose={() => setOpen(false)} />
            <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
          </div>
        </ShellContext.Provider>
      </ToastProvider>
    </ConfirmProvider>
  );
}
