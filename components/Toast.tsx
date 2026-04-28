'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; message: string; type: ToastType };

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType) => void;
}>({ toast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md fade-up ${
              t.type === 'success' ? 'bg-acid/10 border-acid/40 text-acid' :
              t.type === 'error' ? 'bg-red-400/10 border-red-400/40 text-red-400' :
              'bg-ink-2 border-rule text-paper'
            }`}>
            <div className="flex items-start gap-2 text-sm">
              <span className="font-mono text-xs mt-0.5">{t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : 'ℹ'}</span>
              <span className="font-mono text-xs">{t.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
