import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import { pageMetadata, serializeJsonLd, truncateDescription } from "@/lib/seo";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

describe("SEO helpers", () => {
  it("keeps private and high-cost application routes out of crawler discovery", () => {
    const policy = robots();
    const generalRule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;

    expect(generalRule).toMatchObject({
      userAgent: "*",
      allow: "/",
      disallow: expect.arrayContaining([
        "/admin",
        "/api/",
        "/login",
        "/studio",
        "/world",
        "/creators/apply",
        "/dev/",
      ]),
    });
  });

  it("normalizes and bounds descriptions", () => {
    expect(truncateDescription("  one\n two  ", 20)).toBe("one two");
    expect(truncateDescription("abcdefghij", 6)).toBe("abcde…");
  });

  it("cannot close the JSON-LD script element", () => {
    expect(serializeJsonLd({ title: "</script><script>alert(1)</script>" })).not.toContain("<");
  });

  it("supplies a large default social image when a page has no custom image", () => {
    const metadata = pageMetadata({
      title: "หน้าทดสอบ",
      description: "คำอธิบายหน้าทดสอบ",
      path: "/test",
    });

    expect(metadata.openGraph).toMatchObject({
      images: [{
        url: absoluteUrl("/og.jpg"),
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.title}`,
      }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [{
        url: absoluteUrl("/og.jpg"),
        alt: `${siteConfig.name} — ${siteConfig.title}`,
      }],
    });
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: {
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    });
  });

  it("keeps filtered pages out of the index while consolidating their canonical URL", () => {
    const metadata = pageMetadata({
      title: "ผลการค้นหา",
      description: "ผลการค้นหานิยาย",
      path: "/search?q=ทดสอบ",
      canonicalPath: "/search",
      noIndex: true,
    });

    expect(metadata.alternates).toEqual({ canonical: absoluteUrl("/search") });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
