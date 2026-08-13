import {
  Anuphan,
  IBM_Plex_Sans_Thai,
  IBM_Plex_Sans_Thai_Looped,
  JetBrains_Mono,
  Noto_Serif_Thai,
  Sarabun
} from "next/font/google";

/**
 * ส่วนที่ 3 (Typography) × ส่วนที่ 9 (Performance budget)
 *
 * งบฟอนต์คือ "ห้ามโหลดเกิน 4 ไฟล์" แต่สเปกก็ขอ body font ให้ผู้ใช้เลือก 4 ตัว
 * ทางออก: preload เฉพาะ 2 ตระกูลที่ทุก session ใช้แน่ ๆ —
 *   • IBM Plex Sans Thai        (UI/display ทุกหน้า)
 *   • IBM Plex Sans Thai Looped (body ค่าเริ่มต้นของหน้าอ่าน)
 * แต่ละตัว weight 400/600 = 4 ไฟล์พอดีตามงบ
 *
 * อีก 3 ตัวเลือก body (Sarabun / Anuphan / Noto Serif Thai) ตั้ง preload:false
 * ผู้ใช้ที่ไม่ได้เลือกจะไม่โหลดเลย — เสีย request เพิ่มเฉพาะคนที่เลือกจริง
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
  preload: true
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
  preload: false
});

export const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false
});

export const fontVariables = [
  plexThai.variable,
  plexThaiLooped.variable,
  sarabun.variable,
  anuphan.variable,
  notoSerifThai.variable,
  jetBrainsMono.variable
].join(" ");
