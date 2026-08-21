"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const CREATOR_SHARE = 0.7;
const WITHHOLDING_TAX = 0.03;
const MINIMUM_PAYOUT = 500;
const PRICES = [3, 5, 10, 15] as const;

const baht = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("th-TH");

/** Counts to the new value so a slider drag reads as motion, not as a redraw. */
function useCountUp(value: number) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const start = performance.now();
    const duration = reduced ? 0 : 320;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (value - from) * eased;
      setDisplay(next);
      fromRef.current = next;
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
      else fromRef.current = value;
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return display;
}

export function RevenueCalculator() {
  const [price, setPrice] = useState<number>(5);
  const [unlocks, setUnlocks] = useState(1_000);

  const perUnlock = price * CREATOR_SHARE;
  const gross = perUnlock * unlocks;
  const tax = gross * WITHHOLDING_TAX;
  const net = gross - tax;

  const shownGross = useCountUp(gross);
  const shownNet = useCountUp(net);

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">ลองคำนวณดูเอง</h3>
        <p className="text-xs text-(--text-tertiary)">1 เหรียญ = 1 บาท</p>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">ราคาป้ายต่อตอน</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {PRICES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPrice(option)}
              aria-pressed={price === option}
              className={cn(
                "tap-target min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors duration-[var(--dur-fast)]",
                price === option
                  ? "border-transparent bg-[var(--brand-primary)] text-white shadow-[var(--sh-brand)]"
                  : "border-border bg-card text-(--text-secondary) hover:border-[var(--brand-emphasis)]",
              )}
            >
              {option} เหรียญ
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <label htmlFor="unlock-count" className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold">
          จำนวนครั้งที่ตอนถูกปลดล็อก
          <span className="text-base tabular-nums text-[var(--brand-emphasis)]">{whole.format(unlocks)} ครั้ง</span>
        </label>
        <input
          id="unlock-count"
          type="range"
          min={100}
          max={20_000}
          step={100}
          value={unlocks}
          onChange={(event) => setUnlocks(Number(event.target.value))}
          className="mt-3 h-11 w-full accent-[var(--brand-primary)]"
        />
        <div aria-hidden className="flex justify-between text-xs text-(--text-tertiary)">
          <span>100</span>
          <span>20,000</span>
        </div>
      </div>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-2">
        <div className="bg-card p-4">
          <dt className="text-xs text-(--text-secondary)">ส่วนแบ่งของคุณต่อการปลดล็อก 1 ครั้ง</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{baht.format(perUnlock)} บาท</dd>
        </div>
        <div className="bg-card p-4">
          <dt className="text-xs text-(--text-secondary)">รวมก่อนหักภาษี</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{baht.format(shownGross)} บาท</dd>
        </div>
        <div className="bg-card p-4">
          <dt className="text-xs text-(--text-secondary)">หักภาษี ณ ที่จ่าย 3%</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-(--text-secondary)">−{baht.format(tax)} บาท</dd>
        </div>
        <div className="bg-accent-subtle p-4">
          <dt className="text-xs font-semibold text-[var(--brand-emphasis)]">ยอดโอนสุทธิ</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{baht.format(shownNet)} บาท</dd>
        </div>
      </dl>

      <p aria-live="polite" className="mt-3 text-xs leading-6 text-(--text-tertiary)">
        {net < MINIMUM_PAYOUT
          ? `ยอดนี้ยังไม่ถึงขั้นต่ำ ${whole.format(MINIMUM_PAYOUT)} บาท จะทบไปงวดถัดไปให้อัตโนมัติ ไม่หายไปไหน`
          : "ตัวเลขนี้คำนวณจากราคาป้ายเสมอ ไม่ว่าผู้อ่านจะจ่ายจริงเท่าไรหรือใช้เหรียญแจกฟรี"}
      </p>
    </div>
  );
}
