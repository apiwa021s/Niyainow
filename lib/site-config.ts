const DEFAULT_APP_URL = "http://localhost:3000";

export const publicAssetFallbacks = {
  icon: "/icon.svg",
  novelCover: "/fallback-cover.svg",
  novelBackdrop: "/fallback-backdrop.svg",
} as const;

function normalizedBaseUrl(value: string | undefined, fallback = DEFAULT_APP_URL) {
  try {
    const url = new URL(value || fallback);
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}
export const siteConfig = {
  name: "NiyaiThai",
  title: "อ่านนิยายออนไลน์ นิยายแปลไทย อัปเดตทุกวัน",
  description: "อ่านนิยายออนไลน์และนิยายแปลไทยได้ฟรี ค้นหานิยายจีน แฟนตาซี โรแมนติก วาย นิยายจบแล้ว และตอนอัปเดตล่าสุดได้ในที่เดียว",
  url: normalizedBaseUrl(process.env.NEXT_PUBLIC_APP_URL),
  assetUrl: normalizedBaseUrl(process.env.NEXT_PUBLIC_ASSET_URL, DEFAULT_APP_URL)
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteConfig.url}/`).toString();
}

/** Convert an R2 object key to a public CDN URL. Database values remain keys. */
export function assetUrl(key: string | null | undefined, fallback: string = publicAssetFallbacks.icon) {
  if (!key) return fallback;

  const normalizedKey = key.replace(/^\/+/, "");
  if (!normalizedKey || normalizedKey.includes("..") || normalizedKey.includes("\\")) return fallback;

  // ไม่ได้ตั้ง NEXT_PUBLIC_ASSET_URL แยก (เช่นตอน dev) — คืน path สัมพัทธ์ ไม่ใช่
  // URL เต็มของ origin ตัวเอง เพราะ next/image จะถือว่าเป็นภาพนอกและโยน
  // "hostname is not configured under images" ทำให้ทั้ง section พังไปด้วย
  if (siteConfig.assetUrl === siteConfig.url) return `/${normalizedKey}`;

  return `${siteConfig.assetUrl}/${normalizedKey}`;
}
