import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";
import type { NextFetchEvent, NextMiddleware } from "next/server";

import { auth } from "@/auth";
import { decideProxyAccess } from "@/lib/auth/proxy-policy";
import { isWriterModeApiPath, isWriterModeEnabled, isWriterModePagePath } from "@/lib/features/writer-mode";
import { inspectChapterRequest } from "@/lib/security/chapter-request";
import { attachAnonymousSessionCookie } from "@/lib/security/request-identity";
import { recordSecurityEvent } from "@/lib/security/security-events";

type AuthProxyMiddleware = (request: NextAuthRequest, event: NextFetchEvent) => ReturnType<NextMiddleware>;

function loginRedirect(request: NextAuthRequest, admin = false): NextResponse {
  const url = new URL(admin ? "/admin/login" : "/login", request.url);
  url.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

const CHAPTER_READER_PATH = /^\/novel\/([a-z0-9]+(?:-[a-z0-9]+)*)\/chapter\/(\d+(?:\.\d{1,2})?)$/u;

const authorizeRequest: AuthProxyMiddleware = async (request) => {
  const pathname = request.nextUrl.pathname;
  const chapterMatch = CHAPTER_READER_PATH.exec(pathname);
  if (chapterMatch) {
    const inspection = await inspectChapterRequest({
      request,
      userId: request.auth?.user?.id,
      novelId: chapterMatch[1],
      chapterNumber: Number(chapterMatch[2]),
    });
    if (!inspection.risk.allowed) {
      return attachAnonymousSessionCookie(
        NextResponse.json(
          { error: "RATE_LIMITED" },
          {
            status: 429,
            headers: {
              "Cache-Control": "private, no-store, max-age=0",
              "Retry-After": String(inspection.risk.retryAfterSeconds),
            },
          },
        ),
        inspection.identity,
      );
    }
    await recordSecurityEvent({
      event: "CHAPTER_READ",
      subjectHash: inspection.identity.subjectHash,
      ipHash: inspection.identity.ipHash,
      novelId: chapterMatch[1],
      result: "REQUEST_ACCEPTED",
      riskLevel: inspection.risk.riskLevel,
    });
    return attachAnonymousSessionCookie(NextResponse.next(), inspection.identity);
  }

  const decision = decideProxyAccess(pathname, request.auth?.user);

  if (decision.kind === "allow") return NextResponse.next();
  if (!decision.error) return loginRedirect(request, decision.login === "admin");

  const url = new URL(decision.login === "admin" ? "/admin/login" : "/login", request.url);
  url.searchParams.set("error", decision.error);
  return NextResponse.redirect(url);
};

export async function proxy(request: NextAuthRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  if (!isWriterModeEnabled()) {
    if (isWriterModeApiPath(pathname)) {
      return NextResponse.json(
        { error: { code: "WRITER_MODE_DISABLED", message: "ระบบนักเขียนปิดใช้งานชั่วคราว" } },
        { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0" } },
      );
    }
    if (isWriterModePagePath(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const proxyHandler = (await auth(authorizeRequest)) as NextMiddleware;
  return proxyHandler(request, event);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/history/:path*",
    "/library/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/studio/:path*",
    "/api/studio/:path*",
    "/creators/apply/:path*",
    "/wallet/:path*",
    "/world((?!/(?:ground|environment|props|buildings|portals|vfx|characters)(?:/|$)).*)",
    "/novel/:slug/chapter/:chapter",
  ],
};
