const DEFAULT_APP_URL = "http://localhost:3000";

function normalizedBaseUrl(value: string | undefined, fallback = DEFAULT_APP_URL) {
  try {
    const url = new URL(value || fallback);
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}
export const siteConfig = {
  name: "NiyaiNow",
  title: "อ่านนิยายแปล นิยายออนไลน์ อัปเดตตอนใหม่ทุกวัน",
  description: "แพลตฟอร์มอ่านนิยายออนไลน์ภาษาไทย ค้นหา จัดคลัง และอ่านต่อได้ทุกอุปกรณ์",
  url: normalizedBaseUrl(process.env.NEXT_PUBLIC_APP_URL),
  assetUrl: normalizedBaseUrl(process.env.NEXT_PUBLIC_ASSET_URL, DEFAULT_APP_URL)
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteConfig.url}/`).toString();
}

/** Convert an R2 object key to a public CDN URL. Database values remain keys. */
export function assetUrl(key: string | null | undefined, fallback = "/icon.svg") {
  if (!key) return fallback;

  const normalizedKey = key.replace(/^\/+/, "");
  if (!normalizedKey || normalizedKey.includes("..") || normalizedKey.includes("\\")) return fallback;

  // ไม่ได้ตั้ง NEXT_PUBLIC_ASSET_URL แยก (เช่นตอน dev) — คืน path สัมพัทธ์ ไม่ใช่
  // URL เต็มของ origin ตัวเอง เพราะ next/image จะถือว่าเป็นภาพนอกและโยน
  // "hostname is not configured under images" ทำให้ทั้ง section พังไปด้วย
  if (siteConfig.assetUrl === siteConfig.url) return `/${normalizedKey}`;

  return `${siteConfig.assetUrl}/${normalizedKey}`;
}
