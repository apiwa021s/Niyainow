import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";
import { decideProxyAccess } from "@/lib/auth/proxy-policy";

function loginRedirect(request: NextAuthRequest, admin = false): NextResponse {
  const url = new URL(admin ? "/admin/login" : "/login", request.url);
  url.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const proxy = auth((request) => {
  const pathname = request.nextUrl.pathname;
  const decision = decideProxyAccess(pathname, request.auth?.user);

  if (decision.kind === "allow") return NextResponse.next();
  if (!decision.error) return loginRedirect(request, decision.login === "admin");

  const url = new URL(decision.login === "admin" ? "/admin/login" : "/login", request.url);
  url.searchParams.set("error", decision.error);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/history/:path*",
    "/library/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/wallet/:path*",
  ],
};
