"use client";

import { ChevronDown, Minus, Plus, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { useReaderPrefs } from "@/hooks/use-reader-prefs";
import { cn } from "@/lib/utils";
import {
  DIM_MAX,
  READER_FONTS,
  READER_FONT_KIND,
  READER_FONT_LABELS,
  READER_THEMES,
  READER_THEME_LABELS,
  READER_THEME_SWATCH,
  type ReaderFont,
  type ReaderLineHeight,
  type ReaderTheme,
  type ReaderParagraphStyle,
  type ReaderWidth
} from "@/stores/use-reader-store";

/**
 * Previews use real Thai with a full four-level stack (ปุ๋ย, ญี่ปุ่น) rather than
 * "Aa" — the whole point of the leading control is what happens to tone marks,
 * and Latin sample text cannot show it.
 */
const LEADING_SAMPLE = "ปุ๋ยญี่ปุ่นเกี๊ยะฏิฐิอึ๋ย";
const FONT_SAMPLE = "ปุ๋ยญี่ปุ่น";

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

const PARAGRAPH_OPTIONS: { value: ReaderParagraphStyle; label: string }[] = [
  { value: "gap", label: "เว้นระยะ" },
  { value: "indent", label: "ย่อหน้า" }
];

/** Each option previews in its own face, so the choice is visible not verbal. */
const FONT_PREVIEW_STACK: Record<ReaderFont, string> = {
  looped: "var(--font-read-looped)",
  loopless: "var(--font-read-loopless)",
  serif: "var(--font-read-serif)"
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
    <div role="radiogroup" aria-label={label} className="inline-flex w-full gap-1 rounded-[6px] border border-current/15 bg-current/5 p-1">
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
              "h-11 flex-1 rounded-[5px] text-sm font-semibold transition-colors",
              active ? "bg-[var(--reader-action)] text-white shadow-[var(--sh-brand)]" : "hover:bg-current/10"
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
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[6px] px-2 text-sm hover:bg-current/8"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-[var(--dur-fast)]",
          checked ? "bg-[var(--reader-action)]" : "bg-current/25"
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
export function ReaderSettings({
  open,
  onClose,
  returnFocusRef,
  signedIn = false,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  signedIn?: boolean;
}) {
  const { prefs, fontSizePx, canGrow, canShrink, setPrefs, resetPrefs, stepFontSize } = useReaderPrefs({ signedIn });
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // focus trap อย่างง่าย + ปิดด้วย Esc (ส่วนที่ 7)
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    previousFocusRef.current = returnFocusRef?.current
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
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
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    setDragOffset(Math.max(0, event.clientY - dragStartY.current));
  };

  const endDrag = () => {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    if (dragOffset > 96) onClose();
    setDragOffset(0);
  };

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
          "motion-sheet inset-x-0 bottom-0 max-h-[85vh] rounded-t-[10px] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3",
          // desktop: popover มุมขวาบน
          "sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-16 sm:max-h-[80vh] sm:w-[380px] sm:rounded-[8px] sm:p-5"
        )}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined }}
      >
        {/* drag handle ของ bottom sheet */}
        <div
          aria-hidden
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="mx-auto h-1 w-10 shrink-0 touch-none rounded-full bg-current/25 sm:hidden"
        />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">ตั้งค่าการอ่าน</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดตั้งค่าการอ่าน"
            className="grid h-11 w-11 place-items-center rounded-[6px] border border-current/12 bg-current/5 hover:bg-current/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Row label="ธีม">
          <div role="radiogroup" aria-label="ธีมหน้าอ่าน" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    "flex min-h-12 items-center justify-center gap-1.5 rounded-[6px] border px-2 text-xs font-semibold transition-colors duration-[var(--dur-fast)]",
                    active ? "border-[var(--reader-accent)] bg-current/8" : "border-current/20 hover:bg-current/6"
                  )}
                  style={{ background: swatch.bg, color: swatch.fg }}
                >
                  <span className="text-base">ก</span>
                  <span>{READER_THEME_LABELS[theme]}</span>
                </button>
              );
            })}
          </div>
        </Row>

        <Row label={`ขนาดอักษร · ${fontSizePx}px`}>
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
            <button
              type="button"
              aria-label="ลดขนาดอักษร"
              disabled={!canShrink}
              onClick={() => stepFontSize(-1)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[6px] border border-current/15 bg-current/5 hover:bg-current/10 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            {/* The sample is set at the size being chosen, in the reading face. */}
            <span
              aria-live="polite"
              className="overflow-hidden text-center font-semibold"
              style={{ fontFamily: "var(--read-family)", fontSize: `${fontSizePx}px`, lineHeight: 1.6 }}
            >
              ปุ๋ย {fontSizePx}px
            </span>
            <button
              type="button"
              aria-label="เพิ่มขนาดอักษร"
              disabled={!canGrow}
              onClick={() => stepFontSize(1)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[6px] border border-current/15 bg-current/5 hover:bg-current/10 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </Row>

        <Row label="ฟอนต์">
          <div role="radiogroup" aria-label="ฟอนต์หน้าอ่าน" className="grid grid-cols-3 gap-2">
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
                    "flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-[6px] border px-3 py-2 text-left transition-colors",
                    active ? "border-[var(--reader-accent)] bg-current/8" : "border-current/15 bg-current/5 hover:bg-current/10"
                  )}
                >
                  <span className="text-base font-semibold" style={{ fontFamily: FONT_PREVIEW_STACK[font], lineHeight: 1.5 }}>
                    {READER_FONT_LABELS[font]}
                  </span>
                  <span className="text-[11px] leading-[1.5] opacity-65">{READER_FONT_KIND[font]}</span>
                  <span className="text-sm leading-[1.7] opacity-80" style={{ fontFamily: FONT_PREVIEW_STACK[font] }}>{FONT_SAMPLE}</span>
                </button>
              );
            })}
          </div>
        </Row>

        {/* Leading is the single highest-leverage control for Thai, so it is not
            buried behind a disclosure the way it used to be. */}
        <Row label="ระยะบรรทัด">
          <SegmentedControl
            label="ระยะบรรทัด"
            value={prefs.lineHeight}
            options={LINE_HEIGHT_OPTIONS}
            onChange={(lineHeight) => setPrefs({ lineHeight })}
          />
          <p
            aria-hidden
            className="mt-1 rounded-[6px] bg-current/5 px-3 py-2 text-sm"
            style={{ fontFamily: "var(--read-family)", lineHeight: "var(--read-leading)" }}
          >
            {LEADING_SAMPLE}
            <br />
            {LEADING_SAMPLE}
          </p>
        </Row>

        <Row label="รูปแบบย่อหน้า">
          <SegmentedControl
            label="รูปแบบย่อหน้า"
            value={prefs.paragraphStyle}
            options={PARAGRAPH_OPTIONS}
            onChange={(paragraphStyle) => setPrefs({ paragraphStyle })}
          />
        </Row>

        {/* Width has nothing to control on a phone: the measure is the viewport. */}
        <div className="hidden sm:block">
          <Row label="ความกว้าง">
            <SegmentedControl label="ความกว้าง" value={prefs.width} options={WIDTH_OPTIONS} onChange={(width) => setPrefs({ width })} />
          </Row>
        </div>

        <details className="group rounded-[6px] border border-current/15 bg-current/5">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold hover:bg-current/6 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />การตั้งค่าขั้นสูง</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-5 border-t border-current/10 p-3">
            <Row label={`ความสว่าง · ${Math.round((1 - prefs.dim) * 100)}%`}>
              <input
                type="range"
                min={0}
                max={DIM_MAX}
                step={0.05}
                value={prefs.dim}
                aria-label="ความสว่างหน้าจอ"
                onChange={(event) => setPrefs({ dim: Number(event.target.value) })}
                className="h-11 w-full accent-[var(--reader-accent)]"
              />
            </Row>

            <Toggle
              label="ล็อกหน้าจอไม่ให้ดับ"
              checked={prefs.keepScreenAwake}
              onChange={(keepScreenAwake) => setPrefs({ keepScreenAwake })}
            />
          </div>
        </details>

        <button
          type="button"
          onClick={resetPrefs}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[6px] border border-current/15 bg-current/5 text-sm font-semibold hover:bg-current/10"
        >
          <RotateCcw className="h-4 w-4" />
          รีเซ็ตค่าเริ่มต้น
        </button>
      </div>
    </>
  );
}
