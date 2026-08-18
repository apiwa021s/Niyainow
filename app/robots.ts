import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private HTML routes expose their own noindex directive. They must stay
        // crawlable for search engines to read it; only non-public surfaces are blocked here.
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
