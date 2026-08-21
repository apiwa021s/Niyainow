"use client";

import {
  ArrowLeft,
  BookMarked,
  Check,
  CircleOff,
  Coins,
  Eye,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { StudioWork } from "@/components/studio/mock-data";
import { workStatusLabels } from "@/components/studio/mock-data";
import { StatusPill } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const menuItems = (work: StudioWork) =>
  [
    { label: "แก้ไขข้อมูลเรื่อง", href: `/studio/works/${work.slug}`, icon: Pencil },
    { label: "จัดการราคา", href: `/studio/works/${work.slug}/pricing`, icon: Coins },
    { label: "ดูรายได้", href: `/studio/works/${work.slug}/earnings`, icon: Wallet },
    { label: "ดูตัวอย่างหน้าเรื่อง", href: `/novel/${work.slug}`, icon: Eye },
  ] as const;

export function StoryHeader({ work }: { work: StudioWork }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const status = workStatusLabels[work.status];

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function share() {
    const url = `${window.location.origin}/novel/${work.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: work.title, url });
      } catch {
        // Cancelled — not an error the writer needs to see.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast({ tone: "success", message: "คัดลอกลิงก์เรื่องแล้ว" });
  }

  function togglePause() {
    setMenuOpen(false);
    toast({
      tone: "info",
      message: work.status === "hiatus" ? "กลับมาเผยแพร่ต่อแล้ว" : "พักการเผยแพร่เรื่องนี้แล้ว ผู้อ่านเดิมยังเห็นตอนที่เผยแพร่แล้วตามปกติ",
    });
  }

  function markComplete() {
    setMenuOpen(false);
    toast({ tone: "success", message: `ตั้ง "${work.title}" เป็นจบแล้ว` });
  }

  return (
    <header className="grid gap-4">
      <Link
        href="/studio/works"
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        ผลงานของฉัน
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden
          className="grid h-36 w-24 shrink-0 place-items-center rounded-[8px] bg-accent-subtle text-brand-primary"
        >
          <BookMarked className="h-7 w-7" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-(--text-secondary)">{work.genreLabel}</p>
          <h1 className="mt-1 text-h1 font-semibold">{work.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill label={status.label} dot={status.dot} />
            <span className="text-xs text-(--text-tertiary)">อัปเดตล่าสุด {work.updatedAt}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ButtonLink href={`/studio/works/${work.slug}/chapters/new`} variant="primary">
              <Plus aria-hidden className="h-4 w-4" />
              เขียนตอนใหม่
            </ButtonLink>
            <ButtonLink href={`/novel/${work.slug}`} variant="outline">
              <ExternalLink aria-hidden className="h-4 w-4" />
              ดูหน้าเรื่อง
            </ButtonLink>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="ตัวเลือกเพิ่มเติมของเรื่อง"
                className="grid h-11 w-11 place-items-center rounded-(--r-md) border border-border text-(--text-secondary) hover:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+8px)] z-20 w-64 overflow-hidden rounded-[12px] border border-border bg-popover p-1.5 shadow-[var(--sh-3)] sm:left-auto sm:right-0"
                >
                  {menuItems(work).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-11 items-center gap-2.5 rounded-(--r-md) px-3 text-sm hover:bg-muted"
                      >
                        <Icon aria-hidden className="h-4 w-4 text-(--text-tertiary)" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={share}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-(--r-md) px-3 text-left text-sm hover:bg-muted"
                  >
                    <Share2 aria-hidden className="h-4 w-4 text-(--text-tertiary)" />
                    แชร์เรื่อง
                  </button>
                  <hr className="my-1 border-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={togglePause}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-(--r-md) px-3 text-left text-sm hover:bg-muted"
                  >
                    <CircleOff aria-hidden className="h-4 w-4 text-(--text-tertiary)" />
                    {work.status === "hiatus" ? "กลับมาเผยแพร่ต่อ" : "พักการเผยแพร่"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={markComplete}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-(--r-md) px-3 text-left text-sm hover:bg-muted"
                  >
                    <Check aria-hidden className="h-4 w-4 text-(--text-tertiary)" />
                    ตั้งเป็นจบแล้ว
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
