/**
 * Reading preference scales, labels, and normalisation.
 *
 * Deliberately free of "use client" and of any zustand import: the pre-paint
 * script and /dev/type-spec are Server Components and need the actual values.
 * A named export pulled from a "use client" module across that boundary comes
 * back as a client-reference stub, which fails at runtime rather than at build.
 *
 * The stateful store lives in stores/use-reader-store.ts and re-exports all of
 * this, so client code can keep importing from either.
 */

export const READER_THEMES = ["light", "sepia", "dark", "amoled"] as const;
export type ReaderTheme = (typeof READER_THEMES)[number];

export const READER_THEME_LABELS: Record<ReaderTheme, string> = {
  light: "สว่าง",
  sepia: "กระดาษ",
  dark: "มืด",
  amoled: "OLED",
};

/**
 * Swatches for the settings panel only. The colours the reader actually paints
 * with live in app/tokens.css, keyed by [data-read-theme] — duplicating them
 * here is what let the two drift apart before.
 */
export const READER_THEME_SWATCH: Record<ReaderTheme, { bg: string; fg: string }> = {
  light: { bg: "#fbfaf8", fg: "#1f2328" },
  sepia: { bg: "#f4ecd8", fg: "#5b4636" },
  dark: { bg: "#16171a", fg: "#e3e1dc" },
  amoled: { bg: "#000000", fg: "#c9c7c2" },
};

export const READER_FONTS = ["looped", "loopless", "serif"] as const;
export type ReaderFont = (typeof READER_FONTS)[number];

export const READER_FONT_LABELS: Record<ReaderFont, string> = {
  looped: "อ่านสบาย",
  loopless: "โมเดิร์น",
  serif: "คลาสสิก",
};

/** Shown under the name so the choice is describable, not just visual. */
export const READER_FONT_KIND: Record<ReaderFont, string> = {
  looped: "มีหัว",
  loopless: "ไม่มีหัว",
  serif: "มีเชิง",
};

/**
 * Size is stored as an index, not a px value: it keeps the steps meaningful
 * (1px apart where readers actually discriminate, wider at the top end) and
 * survives a change to the scale without stranding anyone on an orphan value.
 */
export const FONT_SIZE_SCALE = [16, 17, 18, 19, 20, 22, 24, 28] as const;
export const FONT_SIZE_DEFAULT_INDEX = 3;
export const FONT_SIZE_MIN_INDEX = 0;
export const FONT_SIZE_MAX_INDEX = FONT_SIZE_SCALE.length - 1;

export function fontSizeAt(index: number) {
  return FONT_SIZE_SCALE[clampSizeIndex(index)];
}

export function clampSizeIndex(index: number) {
  if (!Number.isFinite(index)) return FONT_SIZE_DEFAULT_INDEX;
  return Math.min(FONT_SIZE_MAX_INDEX, Math.max(FONT_SIZE_MIN_INDEX, Math.round(index)));
}

/** Nearest index for a legacy px value, so an upgrade never resets a reader. */
export function sizeIndexFromPx(px: number) {
  if (!Number.isFinite(px)) return FONT_SIZE_DEFAULT_INDEX;
  let best = FONT_SIZE_DEFAULT_INDEX;
  for (let i = 0; i < FONT_SIZE_SCALE.length; i += 1) {
    if (Math.abs(FONT_SIZE_SCALE[i] - px) < Math.abs(FONT_SIZE_SCALE[best] - px)) best = i;
  }
  return best;
}

export type ReaderLineHeight = "tight" | "normal" | "airy";
export type ReaderWidth = "narrow" | "normal" | "wide";
export type ReaderParagraphStyle = "gap" | "indent";

/**
 * Thai stacks four levels — lower vowel, base, upper vowel, tone mark — so the
 * floor here is 1.65, not the 1.5 a Latin-derived scale would use. See
 * docs/TYPOGRAPHY.md §3.1.
 */
export const LINE_HEIGHT_VALUES: Record<ReaderLineHeight, number> = {
  tight: 1.65,
  normal: 1.85,
  airy: 2.05,
};

export const WIDTH_VALUES: Record<ReaderWidth, string> = {
  narrow: "600px",
  normal: "680px",
  wide: "780px",
};

/** Screen dimming may not eat into body contrast, so the range stops early. */
export const DIM_MAX = 0.35;

export type ReaderPrefs = {
  theme: ReaderTheme;
  font: ReaderFont;
  fontSizeIndex: number;
  lineHeight: ReaderLineHeight;
  width: ReaderWidth;
  paragraphStyle: ReaderParagraphStyle;
  dim: number;
  keepScreenAwake: boolean;
};

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: "sepia",
  font: "looped",
  fontSizeIndex: FONT_SIZE_DEFAULT_INDEX,
  lineHeight: "normal",
  width: "normal",
  paragraphStyle: "gap",
  dim: 0,
  keepScreenAwake: false,
};

/** Storage key shared with the pre-paint script; changing it must be done in both. */
export const READER_STORAGE_KEY = "niyainow-reader";

/** Narrow anything (localStorage, an API payload) into a usable prefs object. */
export function normalizeReaderPrefs(input: unknown): ReaderPrefs {
  const raw = (input ?? {}) as Record<string, unknown>;
  const legacyFont = raw.font === "anuphan" || raw.font === "sarabun" ? undefined : raw.font;
  const theme = raw.theme === "mist" ? "sepia" : raw.theme;

  return {
    theme: READER_THEMES.includes(theme as ReaderTheme) ? (theme as ReaderTheme) : DEFAULT_PREFS.theme,
    font: READER_FONTS.includes(legacyFont as ReaderFont)
      ? (legacyFont as ReaderFont)
      : raw.font === "anuphan"
        ? "loopless"
        : DEFAULT_PREFS.font,
    fontSizeIndex: typeof raw.fontSizeIndex === "number"
      ? clampSizeIndex(raw.fontSizeIndex)
      : typeof raw.fontSize === "number"
        ? sizeIndexFromPx(raw.fontSize)
        : DEFAULT_PREFS.fontSizeIndex,
    lineHeight: raw.lineHeight === "tight" || raw.lineHeight === "airy" || raw.lineHeight === "normal"
      ? raw.lineHeight
      : DEFAULT_PREFS.lineHeight,
    width: raw.width === "narrow" || raw.width === "wide" || raw.width === "normal"
      ? raw.width
      : DEFAULT_PREFS.width,
    paragraphStyle: raw.paragraphStyle === "indent" ? "indent" : "gap",
    dim: typeof raw.dim === "number" && Number.isFinite(raw.dim)
      ? Math.min(DIM_MAX, Math.max(0, raw.dim))
      : 0,
    keepScreenAwake: raw.keepScreenAwake === true,
  };
}

