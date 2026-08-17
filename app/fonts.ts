import {
  Anuphan,
  IBM_Plex_Sans_Thai,
  IBM_Plex_Sans_Thai_Looped,
  Noto_Serif_Thai
} from "next/font/google";

/**
 * The whole UI is IBM Plex Sans Thai — headings included. Serif is a reader
 * preference only (brief §4.3), so it is loaded on demand like the other
 * reader alternatives rather than preloaded on every page.
 */

export const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true
});

export const plexThaiLooped = IBM_Plex_Sans_Thai_Looped({
  variable: "--font-plex-thai-looped",
  subsets: ["thai", "latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: false
});

export const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
  display: "swap",
  preload: false
});

export const notoSerifThai = Noto_Serif_Thai({
  variable: "--font-noto-serif-thai",
  subsets: ["thai", "latin"],
  display: "swap",
  preload: false
});

export const fontVariables = [
  plexThai.variable,
  plexThaiLooped.variable,
  anuphan.variable,
  notoSerifThai.variable
].join(" ");
