'use client';

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info } from "lucide-react";
import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastVariant = "default" | "success";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastItem = ToastInput & { id: number };

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, variant = "default" }: ToastInput) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((current) => [...current, { id, title, description, variant }]);
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 max-[640px]:bottom-3">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-[var(--radius)] border p-4 shadow-[var(--shadow-md)] backdrop-blur-[6px] ${
                toast.variant === "success" ? "border-success bg-[rgba(34,197,94,0.14)]" : "border-border bg-surface"
              }`}
              role="status"
            >
              {toast.variant === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0 text-accent-secondary" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground">{toast.title}</p>
                {toast.description ? <p className="mt-0.5 text-xs opacity-70">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="ml-1 shrink-0 text-xs opacity-50 transition hover:opacity-90"
                onClick={() => dismissToast(toast.id)}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
