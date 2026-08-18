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
  canonicalPath?: string;
  image?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const description = truncateDescription(input.description);
  const canonical = absoluteUrl(input.canonicalPath ?? input.path);
  const imageUrl = absoluteUrl(input.image || "/og.png");
  const imageAlt = input.image
    ? `${input.title} — ${siteConfig.name}`
    : `${siteConfig.name} — ${siteConfig.title}`;
  const openGraphImage = input.image
    ? { url: imageUrl, alt: imageAlt }
    : { url: imageUrl, width: 1200, height: 630, alt: imageAlt };

  return {
    title: input.title,
    description,
    alternates: { canonical },
    robots: input.noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: input.type ?? "website",
      locale: "th_TH",
      siteName: siteConfig.name,
      title: input.title,
      description,
      url: canonical,
      images: [openGraphImage],
      ...(input.type === "article" && input.publishedTime
        ? { publishedTime: input.publishedTime }
        : {}),
      ...(input.type === "article" && input.modifiedTime
        ? { modifiedTime: input.modifiedTime }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
  };
}

/** Prevents a JSON-LD payload from terminating its script element. */
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}
