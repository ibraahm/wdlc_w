'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; variant: ToastVariant };
type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type FeedbackApi = {
  toast: (message: string, variant?: ToastVariant) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useToast(): FeedbackApi['toast'] {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useToast must be used within FeedbackProvider');
  return ctx.toast;
}

export function useConfirm(): FeedbackApi['confirm'] {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useConfirm must be used within FeedbackProvider');
  return ctx.confirm;
}

const TOAST_STYLE: Record<ToastVariant, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-gray-200 bg-white text-gray-800',
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ opts, resolve })),
    [],
  );

  const close = (result: boolean) => {
    setConfirmState((s) => {
      s?.resolve(result);
      return null;
    });
  };

  const api = useMemo<FeedbackApi>(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      {/* Toasts */}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-80 max-w-[90vw] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${TOAST_STYLE[t.variant]}`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900">{confirmState.opts.title ?? 'Please confirm'}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{confirmState.opts.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {confirmState.opts.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white ${confirmState.opts.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-navy hover:opacity-90'}`}
              >
                {confirmState.opts.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
