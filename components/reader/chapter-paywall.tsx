"use client";

import Link from "next/link";
import { Coins, Lock } from "lucide-react";
import { useState } from "react";
import { useReaderStore } from "@/stores/use-reader-store";

/**
 * การ์ดปลดล็อกตอน (ส่วนที่ 6.7 — Paywall)
 * กติกา: ห้ามหน้าขาวเปล่า → ผู้เรียกจะเรนเดอร์ 2 ย่อหน้าแรกแล้ว fade ก่อนถึงการ์ดนี้
 * และต้องแสดงราคา + ยอดคงเหลือชัดเจนเสมอ (ส่วนที่ 11)
 */
export function ChapterPaywall({
  novelSlug,
  chapterNumber,
  price,
  bundleSize = 10,
  onUnlocked
}: {
  novelSlug: string;
  chapterNumber: number;
  price: number;
  bundleSize?: number;
  onUnlocked: () => void;
}) {
  const coins = useReaderStore((state) => state.coins);
  const unlockChapter = useReaderStore((state) => state.unlockChapter);
  const unlockChapters = useReaderStore((state) => state.unlockChapters);
  const [error, setError] = useState<string | null>(null);

  const bundleFull = price * bundleSize;
  const bundlePrice = Math.round(bundleFull * 0.9);
  const bundleSaving = bundleFull - bundlePrice;
  const enough = coins >= price;

  const finish = (ok: boolean) => {
    if (!ok) {
      setError("เหรียญไม่พอ เติมเหรียญก่อนปลดล็อกได้เลย");
      return;
    }
    setError(null);
    // ปลดล็อกแล้วเนื้อหาโผล่ในหน้าเดิม ไม่ reload (ส่วนที่ 6.7)
    onUnlocked();
  };

  const handleUnlockOne = () => finish(unlockChapter(novelSlug, chapterNumber, price));

  const handleUnlockBundle = () => {
    const numbers = Array.from({ length: bundleSize }, (_, index) => chapterNumber + index);
    finish(unlockChapters(novelSlug, numbers, bundlePrice));
  };

  return (
    <section
      aria-label={`ปลดล็อกตอนที่ ${chapterNumber}`}
      className="mx-auto mt-8 max-w-[520px] rounded-[16px] border border-current/15 bg-current/4 p-5 text-center"
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--brand-primary)]/12">
        <Lock className="h-5 w-5 text-[var(--brand-primary)]" />
      </div>

      <h2 className="mt-3 text-lg font-semibold">ตอนที่ {chapterNumber} เป็นตอนพิเศษ</h2>
      <p className="mt-1 text-sm opacity-75">ปลดล็อกเพื่ออ่านต่อได้ทันที</p>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        <Coins className="h-4 w-4 text-[var(--brand-pink)]" />
        <span className="tabular">
          เหรียญคงเหลือ <strong>{coins.toLocaleString("th-TH")}</strong>
        </span>
      </div>

      <button
        type="button"
        onClick={handleUnlockOne}
        className="mt-4 grid min-h-12 w-full place-items-center rounded-[12px] bg-[image:var(--grad-primary)] px-4 text-base font-semibold text-white shadow-[var(--sh-brand)] transition-transform duration-[var(--dur-fast)] active:translate-y-px"
      >
        ปลดล็อก {price} เหรียญ
      </button>

      <button
        type="button"
        onClick={handleUnlockBundle}
        className="mt-2 grid min-h-12 w-full place-items-center rounded-[12px] border border-current/20 px-4 text-sm font-semibold hover:bg-current/8"
      >
        ปลดล็อก {bundleSize} ตอนถัดไป {bundlePrice} เหรียญ (ประหยัด {bundleSaving} เหรียญ)
      </button>

      {!enough || error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--brand-pink)]">
          {error ?? "เหรียญไม่พอสำหรับตอนนี้"}{" "}
          <Link href="/wallet" className="font-semibold underline underline-offset-2">
            เติมเหรียญ
          </Link>
        </p>
      ) : null}
    </section>
  );
}
