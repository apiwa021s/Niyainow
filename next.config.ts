import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { NextConfig } from "next";

function buildPublicUrl(name: "NEXT_PUBLIC_APP_URL" | "NEXT_PUBLIC_ASSET_URL", phase: string) {
  const value = process.env[name];
  if (phase !== PHASE_PRODUCTION_BUILD) return value;

  if (!value) {
    throw new Error(`${name} is required when creating a production artifact`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`${name} must be a credential-free HTTPS URL for production builds`);
  }

  return url.toString().replace(/\/$/u, "");
}

export default function createNextConfig(phase: string): NextConfig {
  // Both values are embedded into the artifact. Validate the app URL even
  // though only the asset URL is needed to construct Next Image policy here.
  buildPublicUrl("NEXT_PUBLIC_APP_URL", phase);
  const assetUrl = buildPublicUrl("NEXT_PUBLIC_ASSET_URL", phase);
  const isProduction = process.env.NODE_ENV === "production";

  const assetOrigin = (() => {
    try {
      return assetUrl ? new URL(assetUrl).origin : null;
    } catch {
      return null;
    }
  })();
  const assetPattern = (() => {
    if (!assetUrl) return [];
    try {
      const url = new URL(assetUrl);
      if (url.protocol !== "https:") return [];
      return [{ protocol: "https" as const, hostname: url.hostname, port: url.port, pathname: "/**" }];
    } catch {
      return [];
    }
  })();

  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      "https://accounts.google.com",
      "https://oauth2.googleapis.com",
      "https://*.r2.cloudflarestorage.com",
      ...(assetOrigin ? [assetOrigin] : []),
      ...(isProduction ? [] : ["ws:", "wss:"]),
    ].join(" "),
    "worker-src 'self' blob:",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  return {
    poweredByHeader: false,
    images: {
      formats: ["image/avif", "image/webp"],
      remotePatterns: assetPattern,
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Content-Security-Policy", value: contentSecurityPolicy },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
            ...(isProduction
              ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
              : []),
          ],
        },
      ];
    },
  };
}
