import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";
import type { NextFetchEvent, NextMiddleware } from "next/server";

import { auth } from "@/auth";
import { decideProxyAccess } from "@/lib/auth/proxy-policy";
import { isWriterModeApiPath, isWriterModeEnabled, isWriterModePagePath } from "@/lib/features/writer-mode";

type AuthProxyMiddleware = (request: NextAuthRequest, event: NextFetchEvent) => ReturnType<NextMiddleware>;

function loginRedirect(request: NextAuthRequest, admin = false): NextResponse {
  const url = new URL(admin ? "/admin/login" : "/login", request.url);
  url.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

const authorizeRequest: AuthProxyMiddleware = (request) => {
  const pathname = request.nextUrl.pathname;
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
  ],
};
