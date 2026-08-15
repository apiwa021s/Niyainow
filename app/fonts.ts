import {
  Anuphan,
  IBM_Plex_Sans_Thai,
  IBM_Plex_Sans_Thai_Looped,
  Noto_Serif_Thai,
  Sarabun
} from "next/font/google";

/**
 * Preload only the two families used above the fold on public pages:
 * IBM Plex Sans Thai for UI/body copy and Noto Serif Thai for headings.
 * Reader alternatives stay demand-loaded, and small mono labels use the
 * system stack to avoid another global font request.
 */

export const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "600"],
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

export const sarabun = Sarabun({
  variable: "--font-sarabun",
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
  preload: true
});

export const fontVariables = [
  plexThai.variable,
  plexThaiLooped.variable,
  sarabun.variable,
  anuphan.variable,
  notoSerifThai.variable
].join(" ");
