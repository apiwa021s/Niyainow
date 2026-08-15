"use client";

import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  READER_FONTS,
  READER_FONT_LABELS,
  READER_THEMES,
  READER_THEME_LABELS,
  READER_THEME_SWATCH,
  useReaderStore,
  type ReaderFont,
  type ReaderLineHeight,
  type ReaderTheme,
  type ReaderWidth
} from "@/stores/use-reader-store";

const LINE_HEIGHT_OPTIONS: { value: ReaderLineHeight; label: string }[] = [
  { value: "tight", label: "แน่น" },
  { value: "normal", label: "ปกติ" },
  { value: "airy", label: "โปร่ง" }
];

const WIDTH_OPTIONS: { value: ReaderWidth; label: string }[] = [
  { value: "narrow", label: "แคบ" },
  { value: "normal", label: "ปกติ" },
  { value: "wide", label: "กว้าง" }
];

/** class ตัวอย่างฟอนต์ ให้ dropdown แสดงด้วยฟอนต์นั้นจริง ๆ */
const FONT_PREVIEW_CLASS: Record<ReaderFont, string> = {
  looped: "reader-font-looped",
  sarabun: "reader-font-sarabun",
  anuphan: "reader-font-anuphan",
  serif: "reader-font-serif"
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold tracking-wide opacity-70">{label}</span>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full gap-1 rounded-[8px] border border-current/15 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 flex-1 rounded-[6px] text-sm font-semibold transition-colors",
              active ? "bg-[var(--brand-primary)] text-white" : "hover:bg-current/8"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-sm"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-[var(--dur-fast)]",
          checked ? "bg-[var(--brand-primary)]" : "bg-current/25"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)]",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

/**
 * แผงตั้งค่าการอ่าน (ส่วนที่ 6.7)
 * bottom sheet บนมือถือ / popover บนเดสก์ท็อป — เห็นผลทันทีขณะปรับ (live preview)
 * เพราะทุกค่าเขียนกลับ store แล้ว ReaderView อ่านผ่าน CSS variable
 */
export function ReaderSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const prefs = useReaderStore((state) => state.prefs);
  const setPrefs = useReaderStore((state) => state.setPrefs);
  const resetPrefs = useReaderStore((state) => state.resetPrefs);
  const panelRef = useRef<HTMLDivElement>(null);

  // focus trap อย่างง่าย + ปิดด้วย Esc (ส่วนที่ 7)
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("button, [href], input, select")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="ตั้งค่าการอ่าน"
        className={cn(
          "fixed z-50 flex flex-col gap-5 overflow-y-auto bg-[var(--reader-bg)] text-[var(--reader-text)] shadow-[var(--sh-3)]",
          // mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[85vh] rounded-t-[12px] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3",
          // desktop: popover มุมขวาบน
          "sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-16 sm:max-h-[80vh] sm:w-[380px] sm:rounded-[8px] sm:p-5"
        )}
      >
        {/* drag handle ของ bottom sheet */}
        <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-current/25 sm:hidden" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">ตั้งค่าการอ่าน</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดตั้งค่าการอ่าน"
            className="grid h-11 w-11 place-items-center rounded-[8px] hover:bg-current/8"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Row label="ธีม">
          <div role="radiogroup" aria-label="ธีมหน้าอ่าน" className="flex flex-wrap gap-3">
            {READER_THEMES.map((theme: ReaderTheme) => {
              const active = prefs.theme === theme;
              const swatch = READER_THEME_SWATCH[theme];
              return (
                <button
                  key={theme}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={READER_THEME_LABELS[theme]}
                  title={READER_THEME_LABELS[theme]}
                  onClick={() => setPrefs({ theme })}
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-full border-2 text-sm font-semibold transition-transform duration-[var(--dur-fast)]",
                    active ? "border-[var(--brand-primary)] scale-105" : "border-current/20"
                  )}
                  style={{ background: swatch.bg, color: swatch.fg }}
                >
                  ก
                </button>
              );
            })}
          </div>
        </Row>

        <Row label={`ขนาดอักษร · ${prefs.fontSize}px`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="ลดขนาดอักษร"
              disabled={prefs.fontSize <= FONT_SIZE_MIN}
              onClick={() => setPrefs({ fontSize: Math.max(FONT_SIZE_MIN, prefs.fontSize - FONT_SIZE_STEP) })}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-current/20 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              step={FONT_SIZE_STEP}
              value={prefs.fontSize}
              aria-label="ขนาดอักษร"
              onChange={(event) => setPrefs({ fontSize: Number(event.target.value) })}
              className="h-11 flex-1 accent-[var(--brand-primary)]"
            />
            <button
              type="button"
              aria-label="เพิ่มขนาดอักษร"
              disabled={prefs.fontSize >= FONT_SIZE_MAX}
              onClick={() => setPrefs({ fontSize: Math.min(FONT_SIZE_MAX, prefs.fontSize + FONT_SIZE_STEP) })}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-current/20 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </Row>

        <Row label="ฟอนต์">
          <div className="flex flex-col gap-2">
            {READER_FONTS.map((font) => {
              const active = prefs.font === font;
              return (
                <button
                  key={font}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPrefs({ font })}
                  className={cn(
                    "flex min-h-11 items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-left transition-colors",
                    active ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10" : "border-current/15 hover:bg-current/6"
                  )}
                >
                  <span className="text-xs opacity-70">{READER_FONT_LABELS[font]}</span>
                  <span className={cn("text-base", FONT_PREVIEW_CLASS[font])} style={{ fontFamily: "var(--reader-family)" }}>
                    นิยายใหม่ อัปเดตไว
                  </span>
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="ระยะบรรทัด">
          <SegmentedControl
            label="ระยะบรรทัด"
            value={prefs.lineHeight}
            options={LINE_HEIGHT_OPTIONS}
            onChange={(lineHeight) => setPrefs({ lineHeight })}
          />
        </Row>

        <Row label="ความกว้าง">
          <SegmentedControl label="ความกว้าง" value={prefs.width} options={WIDTH_OPTIONS} onChange={(width) => setPrefs({ width })} />
        </Row>

        <Row label={`ระยะย่อหน้า · ${prefs.paragraphGap.toFixed(1)}em`}>
          <input
            type="range"
            min={0.6}
            max={1.8}
            step={0.1}
            value={prefs.paragraphGap}
            aria-label="ระยะห่างระหว่างย่อหน้า"
            onChange={(event) => setPrefs({ paragraphGap: Number(event.target.value) })}
            className="h-11 w-full accent-[var(--brand-primary)]"
          />
        </Row>

        <Row label={`ความสว่าง · ${Math.round((1 - prefs.dim) * 100)}%`}>
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.05}
            value={prefs.dim}
            aria-label="ความสว่างหน้าจอ"
            onChange={(event) => setPrefs({ dim: Number(event.target.value) })}
            className="h-11 w-full accent-[var(--brand-primary)]"
          />
        </Row>

        <div className="flex flex-col gap-1 border-t border-current/10 pt-3">
          <Toggle
            label="ล็อกหน้าจอไม่ให้ดับ"
            checked={prefs.keepScreenAwake}
            onChange={(keepScreenAwake) => setPrefs({ keepScreenAwake })}
          />
        </div>

        <button
          type="button"
          onClick={resetPrefs}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-current/20 text-sm font-semibold hover:bg-current/8"
        >
          <RotateCcw className="h-4 w-4" />
          รีเซ็ตค่าเริ่มต้น
        </button>
      </div>
    </>
  );
}
