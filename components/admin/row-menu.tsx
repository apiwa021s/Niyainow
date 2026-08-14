"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  /** ใส่แทน onSelect เมื่อเป็นการพาไปหน้าอื่น */
  href?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
};

/**
 * เมนูคำสั่งท้ายแถวตาราง
 * วางเมนูด้วย position: fixed จากพิกัดปุ่ม เพราะกล่องตารางมี overflow ซ่อนอยู่
 * ถ้าใช้ absolute เมนูจะโดนตัดขอบ
 */
export function RowMenu({ actions, label = "คำสั่งเพิ่มเติม" }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // เลื่อนจอแล้วเมนูจะลอยหลุดจากปุ่ม — ปิดไปเลยง่ายกว่าไล่ตามตำแหน่ง
    const onScroll = () => setOpen(false);

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function toggle() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 208;
      setPosition({
        top: Math.min(rect.bottom + 6, window.innerHeight - 8),
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
      });
    }
    setOpen((value) => !value);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="grid h-9 w-9 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: position.top, left: position.left }}
          className="fixed z-[70] w-52 overflow-hidden rounded-[12px] border border-border bg-popover p-1.5 shadow-[var(--sh-3)]"
        >
          {actions.map((action) => {
            const className = cn(
              "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm font-medium transition-colors",
              action.tone === "danger" ? "text-destructive hover:bg-destructive/10" : "hover:bg-muted",
              action.disabled && "pointer-events-none opacity-50"
            );

            if (action.href) {
              return (
                <Link key={action.label} href={action.href} role="menuitem" className={className} onClick={() => setOpen(false)}>
                  {action.icon}
                  {action.label}
                </Link>
              );
            }

            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  action.onSelect?.();
                  setOpen(false);
                }}
                className={className}
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
