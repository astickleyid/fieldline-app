'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

const ConfirmContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}>({ confirm: async () => false });

export function useConfirm() { return useContext(ConfirmContext); }

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve?: (v: boolean) => void;
  }>({ open: false, options: { title: '' } });

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  function close(result: boolean) {
    state.resolve?.(result);
    setState({ open: false, options: { title: '' } });
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-ink-2 border border-rule rounded-xl w-full max-w-sm fade-up">
            <div className="p-5 border-b border-rule">
              <div className="text-base font-medium text-paper mb-1">{state.options.title}</div>
              {state.options.message && (
                <div className="text-sm text-paper-mute leading-relaxed">{state.options.message}</div>
              )}
            </div>
            <div className="p-3 flex gap-2 justify-end">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 text-xs text-paper-mute hover:text-paper">
                {state.options.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-md text-xs font-medium ${
                  state.options.destructive
                    ? 'bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/20'
                    : 'bg-signal hover:bg-signal-bright text-white'
                }`}>
                {state.options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
