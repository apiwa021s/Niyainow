import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/admin",
          "/api/",
          "/history",
          "/library",
          "/notifications",
          "/profile",
          "/settings",
          "/studio",
          "/wallet",
        ],
      },
      {
        // This is a declared content-use preference, not an authorization control.
        // Verified search crawlers remain allowed by the general rule above.
        userAgent: ["Amazonbot", "Applebot-Extended", "Bytespider", "CCBot", "ClaudeBot", "Google-Extended", "GPTBot"],
        disallow: "/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
