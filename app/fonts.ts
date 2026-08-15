import {
  Anuphan,
  IBM_Plex_Sans_Thai,
  IBM_Plex_Sans_Thai_Looped,
  Noto_Serif_Thai
} from "next/font/google";

/**
 * Public UI uses IBM Plex Sans Thai; editorial headings use Noto Serif Thai.
 * Reader alternatives remain available without preloading every family.
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
  preload: true
});

export const fontVariables = [
  plexThai.variable,
  plexThaiLooped.variable,
  anuphan.variable,
  notoSerifThai.variable
].join(" ");
