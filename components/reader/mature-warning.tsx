"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { notifyLocalMockStores, useLocalMockStore } from "@/hooks/use-local-mock-store";
import { warningLabel } from "@/lib/domain/reader-taste";

const STORAGE_KEY = "niyainow-mature-ack-v1";
const WARNING_THRESHOLD = 4;

function readAcknowledged(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeAcknowledged(next: Set<number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Mock-only preference; safe to skip when storage is unavailable.
  }
  notifyLocalMockStores();
}

/**
 * Mature-content interstitial (brief §Module 8 / Scenario 8). Shown once per
 * heat level (not every chapter) — the reader can opt out of seeing it again
 * for that level, exactly like the "ไม่ต้องแจ้งอีกสำหรับระดับนี้" checkbox in
 * the brief. Never blocks navigation away from the chapter.
 */
export function MatureWarningGate({
  novelHref,
  heat,
  warnings,
}: {
  novelHref: string;
  heat: number;
  warnings: string[];
}) {
  const acknowledged = useLocalMockStore(() => readAcknowledged().has(heat), () => false);
  const [dismissed, setDismissed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const visible = heat >= WARNING_THRESHOLD && !acknowledged && !dismissed;
  if (!visible) return null;

  function confirm() {
    if (dontShowAgain) {
      const next = readAcknowledged();
      next.add(heat);
      writeAcknowledged(next);
    }
    setDismissed(true);
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mature-warning-title"
      className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4"
    >
      <div className="w-full max-w-sm rounded-(--r-lg) bg-[var(--reader-paper)] p-6 text-[var(--reader-text)] shadow-[var(--sh-2)]">
        <p id="mature-warning-title" className="text-lg font-semibold leading-snug">
          ตอนนี้มีเนื้อหาเข้มข้นกว่าปกติ
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)]">
          <Flame className="h-4 w-4" aria-hidden />
          ระดับ {heat}
        </p>
        {warnings.length ? (
          <div className="mt-4">
            <p className="text-sm font-medium opacity-80">มีเนื้อหาเกี่ยวกับ:</p>
            <ul className="mt-2 grid gap-1 text-sm opacity-75">
              {warnings.map((warning) => (
                <li key={warning}>{warningLabel(warning)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <label className="mt-5 flex min-h-11 items-center gap-2 text-sm opacity-75">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
            className="h-4 w-4"
          />
          ไม่ต้องแจ้งอีกสำหรับระดับนี้
        </label>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={confirm}
            className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[var(--brand-primary)] text-sm font-semibold text-white"
          >
            อ่านต่อ
          </button>
          <Link href={novelHref} className="inline-flex h-11 items-center justify-center text-sm font-semibold opacity-70">
            กลับ
          </Link>
        </div>
      </div>
    </div>
  );
}
