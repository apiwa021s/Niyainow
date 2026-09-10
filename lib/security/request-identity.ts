import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";

import { getSecurityRuntimeEnv } from "@/lib/env";
import { clientIpAddress } from "@/lib/security/rate-limit";

export const ANONYMOUS_SESSION_COOKIE = "nn_abuse_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

declare global {
  var __niyainowDevelopmentSecuritySecret: string | undefined;
}

export type RequestIdentity = {
  authenticated: boolean;
  subjectHash: string;
  ipHash: string;
  anonymousSessionId?: string;
  setAnonymousCookie: boolean;
};

function parseCookie(header: string | null, name: string) {
  if (!header) return undefined;
  for (const item of header.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

function securitySecret() {
  const env = getSecurityRuntimeEnv();
  const configured = env.SECURITY_HASH_SECRET ?? env.AUTH_SECRET;
  if (configured) return configured;
  if (env.NODE_ENV === "production") {
    throw new Error("SECURITY_HASH_SECRET or AUTH_SECRET is required for abuse-prevention hashing");
  }
  globalThis.__niyainowDevelopmentSecuritySecret ??= randomUUID();
  return globalThis.__niyainowDevelopmentSecuritySecret;
}

function hash(value: string) {
  return createHmac("sha256", securitySecret()).update(value).digest("hex").slice(0, 32);
}

export function resolveRequestIdentity(request: Request, userId?: string | null): RequestIdentity {
  const current = parseCookie(request.headers.get("cookie"), ANONYMOUS_SESSION_COOKIE);
  const validAnonymousId = current && UUID_PATTERN.test(current) ? current : undefined;
  const anonymousSessionId = userId ? undefined : validAnonymousId ?? randomUUID();
  const ipHash = hash(`ip:${clientIpAddress(request)}`);
  const subject = userId ? `user:${userId}` : `anonymous:${anonymousSessionId}`;

  return {
    authenticated: Boolean(userId),
    subjectHash: hash(`${subject}:ip-signal:${ipHash}`),
    ipHash,
    anonymousSessionId,
    setAnonymousCookie: !userId && !validAnonymousId,
  };
}

export function attachAnonymousSessionCookie(response: NextResponse, identity: RequestIdentity) {
  if (!identity.setAnonymousCookie || !identity.anonymousSessionId) return response;
  response.cookies.set(ANONYMOUS_SESSION_COOKIE, identity.anonymousSessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
