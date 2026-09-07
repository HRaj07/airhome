"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const icons: Record<ToastVariant, ReactNode> = {
    success: <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0" />,
    error: <XCircle size={18} className="text-rausch shrink-0" />,
    info: <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />,
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm sm:left-auto sm:right-4 sm:translate-x-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="animate-slide-up flex items-start gap-2 rounded-xl bg-white dark:bg-neutral-800 text-ink dark:text-neutral-100 shadow-popover px-4 py-3 border border-neutral-200 dark:border-neutral-700"
          >
            {icons[t.variant]}
            <p className="text-sm flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
