import type { Metadata } from "next";

import { absoluteUrl, siteConfig } from "@/lib/site-config";

export function truncateDescription(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const description = truncateDescription(input.description);
  const canonical = absoluteUrl(input.path);
  const images = input.image ? [{ url: input.image }] : undefined;

  return {
    title: input.title,
    description,
    alternates: { canonical },
    robots: input.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: input.type ?? "website",
      locale: "th_TH",
      siteName: siteConfig.name,
      title: input.title,
      description,
      url: canonical,
      images,
    },
    twitter: {
      card: input.image ? "summary_large_image" : "summary",
      title: input.title,
      description,
      images: input.image ? [input.image] : undefined,
    },
  };
}

/** Prevents a JSON-LD payload from terminating its script element. */
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}
