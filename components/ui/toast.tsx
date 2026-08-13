"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toast (ส่วนที่ 7)
 * มุมล่างขวาบนเดสก์ท็อป / บนสุดบนมือถือ, auto-dismiss 4s
 * รองรับปุ่ม action สำหรับสิ่งที่ย้อนได้ ("เลิกทำ" / "ลองใหม่")
 * ประกาศผ่าน aria-live เพื่อให้ screen reader ได้ยิน (ส่วนที่ 8)
 */
export type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
};

type ToastContextValue = {
  toast: (input: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION = 4000;

let nextToastId = 1;

const TONE_STYLE: Record<ToastTone, { icon: typeof Check; className: string }> = {
  success: { icon: Check, className: "text-emerald-500" },
  error: { icon: TriangleAlert, className: "text-destructive" },
  info: { icon: Info, className: "text-[var(--brand-blue-on-light)]" }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: Omit<Toast, "id">) => {
      const id = nextToastId++;
      setToasts((current) => [...current, { ...input, id }]);
      window.setTimeout(() => dismiss(id), DURATION);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 top-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:items-end"
      >
        {toasts.map((item) => {
          const { icon: Icon, className } = TONE_STYLE[item.tone];
          return (
            <div
              key={item.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[12px] border border-border bg-popover p-3 shadow-[var(--sh-3)]"
            >
              <Icon className={cn("h-5 w-5 shrink-0", className)} aria-hidden />
              <p className="min-w-0 flex-1 text-sm">{item.message}</p>

              {item.action ? (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    dismiss(item.id);
                  }}
                  className="shrink-0 rounded-[8px] px-2 py-1 text-sm font-semibold text-[var(--brand-light-on-light)] hover:bg-muted"
                >
                  {item.action.label}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="ปิดการแจ้งเตือน"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** คืน no-op เมื่อไม่มี provider เพื่อให้ component ที่ใช้ toast ยังทำงานได้ */
export function useToast() {
  const context = useContext(ToastContext);
  return context ?? { toast: () => {} };
}
