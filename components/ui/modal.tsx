"use client";

import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * กล่องโต้ตอบกลางจอ (ใช้ทั้งฟอร์มสั้น ๆ และการยืนยันคำสั่ง)
 * - Escape ปิดได้เมื่อไม่ได้ล็อกหน้าต่างระหว่างประมวลผล
 * - โฟกัสวิ่งเข้ากล่องเมื่อเปิด และล็อกการเลื่อนพื้นหลัง
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
  role = "dialog",
  centered = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
  role?: "dialog" | "alertdialog";
  centered?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeFromEffect = useEffectEvent(() => {
    if (dismissible) onClose();
  });

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFromEffect();
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) { event.preventDefault(); panelRef.current?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[80] flex justify-center",
      centered ? "items-center p-4" : "items-end p-0 sm:items-center sm:p-4",
    )}>
      <div className="absolute inset-0 bg-black/50" onClick={dismissible ? onClose : undefined} aria-hidden />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative max-h-[92vh] w-full overflow-y-auto border border-border bg-popover p-5 shadow-[var(--sh-3)]",
          centered ? "rounded-[16px]" : "rounded-t-[24px] sm:rounded-[16px]",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-3xl"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
          </div>
          {dismissible ? <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button> : null}
        </div>

        {children}

        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

/**
 * ยืนยันก่อนทำสิ่งที่ย้อนกลับยากหรือกระทบคนอื่น (เช่น สลับลำดับตอนที่เผยแพร่แล้ว)
 * ข้อความต้องบอก "ผลของการกด" ไม่ใช่แค่ถามว่าแน่ใจไหม
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "ยืนยัน",
  tone = "default"
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      role="alertdialog"
      size="sm"
      centered
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

export type AlertTone = "success" | "info" | "warning" | "danger";

const alertToneStyles: Record<AlertTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
  info: { icon: Info, className: "bg-sky-500/10 text-sky-600 dark:text-sky-300" },
  warning: { icon: TriangleAlert, className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  danger: { icon: CircleAlert, className: "bg-destructive/10 text-destructive" },
};

export function AlertDialog({
  open,
  onClose,
  title,
  description,
  acknowledgeLabel = "รับทราบ",
  tone = "info",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  acknowledgeLabel?: string;
  tone?: AlertTone;
}) {
  const { icon: Icon, className } = alertToneStyles[tone];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      role="alertdialog"
      size="sm"
      centered
      footer={<Button type="button" onClick={onClose}>{acknowledgeLabel}</Button>}
    >
      <div className={cn("grid h-12 w-12 place-items-center rounded-full", className)} aria-hidden>
        <Icon className="h-6 w-6" />
      </div>
    </Modal>
  );
}

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
};

type AlertOptions = {
  title: string;
  description: string;
  acknowledgeLabel?: string;
  tone?: AlertTone;
};

type AppDialogState =
  | ({ kind: "confirm" } & ConfirmOptions)
  | ({ kind: "alert" } & AlertOptions)
  | null;

const AppDialogContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
} | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<AppDialogState>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const finish = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolveRef.current?.(false);
    resolveRef.current = resolve;
    setDialog({ kind: "confirm", ...options });
  }), []);

  const alert = useCallback((options: AlertOptions) => new Promise<void>((resolve) => {
    resolveRef.current?.(false);
    resolveRef.current = () => resolve();
    setDialog({ kind: "alert", ...options });
  }), []);

  const value = useMemo(() => ({ confirm, alert }), [alert, confirm]);

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      {dialog?.kind === "confirm" ? (
        <ConfirmDialog
          open
          onClose={() => finish(false)}
          onConfirm={() => finish(true)}
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          tone={dialog.tone}
        />
      ) : null}
      {dialog?.kind === "alert" ? (
        <AlertDialog
          open
          onClose={() => finish(true)}
          title={dialog.title}
          description={dialog.description}
          acknowledgeLabel={dialog.acknowledgeLabel}
          tone={dialog.tone}
        />
      ) : null}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);
  if (!context) throw new Error("useAppDialog must be used within AppDialogProvider");
  return context;
}
