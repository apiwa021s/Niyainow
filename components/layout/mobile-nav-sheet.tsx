"use client";

import { LogOut, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import type { TopbarViewer } from "@/components/layout/app-topbar";
import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { signOutUser } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const links: [string, string][] = [
  ["หน้าแรก", "/"],
  ["สำรวจนิยาย", "/novels"],
  ["แนวนิยาย", "/genres"],
  ["จัดอันดับ", "/rankings"],
  ["อัปเดตล่าสุด", "/updates"],
  ["แท็ก", "/tags"],
  ["ชั้นหนังสือ", "/library"],
  ["ประวัติการอ่าน", "/history"],
  ["ตั้งค่า", "/settings"],
  ["เกี่ยวกับเรา", "/about"],
];

/** Mobile counterpart of the desktop sidebar. Same destinations, one sheet. */
export function MobileNavSheet({
  open,
  onClose,
  viewer,
}: {
  open: boolean;
  onClose: () => void;
  viewer: TopbarViewer | null;
}) {
  const pathname = usePathname() ?? "/";
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  const isStaff = viewer?.role === "ADMIN" || viewer?.role === "EDITOR";

  return (
    <div className="lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/55"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="เมนูหลัก"
        className="pane-scroll fixed inset-y-0 left-0 z-50 flex w-[min(320px,86vw)] flex-col gap-1 border-r border-border bg-surface p-3"
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-h3 font-semibold">เมนู</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="ปิดเมนู"
            className="grid h-11 w-11 place-items-center rounded-(--r-md) hover:bg-surface-subtle"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {links.map(([label, href]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-(--r-md) px-3 text-body font-medium",
                active ? "bg-accent-subtle text-accent-base" : "text-(--text-secondary) hover:bg-surface-subtle",
              )}
            >
              {label}
            </Link>
          );
        })}

        {isStaff ? (
          <Link
            href="/admin"
            onClick={onClose}
            className="mt-1 flex min-h-11 items-center gap-2 rounded-(--r-md) px-3 text-body font-medium text-(--text-secondary) hover:bg-surface-subtle"
          >
            <ShieldCheck className="h-4 w-4" /> หลังบ้าน
          </Link>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          <ThemeSwitcher />
          {viewer ? (
            <form action={signOutUser}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-(--r-md) border border-border text-body font-semibold hover:bg-surface-subtle"
              >
                <LogOut className="h-4 w-4" /> ออกจากระบบ
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="flex min-h-11 items-center justify-center rounded-(--r-md) bg-accent-base font-semibold text-accent-on"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
