import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    notation: value >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getNowLabel(index: number) {
  const labels = ["13:45", "11:20", "09:50", "เมื่อวาน", "2 วันที่แล้ว", "สัปดาห์นี้"];
  return labels[index % labels.length];
}
