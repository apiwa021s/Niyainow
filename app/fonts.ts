import {
  IBM_Plex_Sans_Thai,
  IBM_Plex_Sans_Thai_Looped,
  Noto_Serif_Thai
} from "next/font/google";

/**
 * Three families, no more (TYPOGRAPHY.md §3.7).
 *
 *   Plex Sans Thai (loopless) — the whole UI, headings included. Never follows
 *     the reader font preference.
 *   Plex Sans Thai Looped     — chapter body default. The loops are the
 *     landmarks the eye uses to tell Thai glyphs apart at reading speed.
 *   Noto Serif Thai           — reader preference only.
 *
 * `adjustFontFallback` matters more here than in Latin-only sites: Thai faces
 * routinely ship non-standard ascent/descent, so without a metric-matched
 * fallback the swap shifts every line and blows the CLS budget.
 */

export const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  adjustFontFallback: true,
  fallback: ["system-ui", "sans-serif"],
  preload: true
});

/**
 * 500 exists solely for the dark themes: Thai tone marks are hairlines that
 * optically thin out on a dark ground and start to disappear (§5.2). Plex
 * Looped is not variable, so the extra step is a real file — loaded lazily
 * because only two of the four themes ever ask for it.
 */
export const plexThaiLooped = IBM_Plex_Sans_Thai_Looped({
  variable: "--font-plex-thai-looped",
  subsets: ["thai", "latin"],
  weight: ["400", "500"],
  display: "swap",
  adjustFontFallback: true,
  fallback: ["system-ui", "sans-serif"],
  /*
   * Not preloaded, and deliberately so: this face is only used inside a
   * chapter, while fontVariables is applied from the root layout, so a preload
   * here would cost every non-reading page a request it never uses. The 500 is
   * a second file but the browser only fetches it once something on the page
   * actually asks for that weight — i.e. only on the dark themes.
   */
  preload: false
});

/* Variable, so 400 and the dark-theme 500 come out of one file. */
export const notoSerifThai = Noto_Serif_Thai({
  variable: "--font-noto-serif-thai",
  subsets: ["thai", "latin"],
  display: "swap",
  adjustFontFallback: true,
  fallback: ["Georgia", "serif"],
  preload: false
});

export const fontVariables = [
  plexThai.variable,
  plexThaiLooped.variable,
  notoSerifThai.variable
].join(" ");
