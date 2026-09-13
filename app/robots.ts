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
          "/login",
          "/notifications",
          "/profile",
          "/register",
          "/forgot-password",
          "/settings",
          "/studio",
          "/wallet",
          "/world",
          "/creators/apply",
          "/dev/",
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
