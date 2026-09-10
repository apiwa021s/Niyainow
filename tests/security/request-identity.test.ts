import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_SESSION_COOKIE,
  attachAnonymousSessionCookie,
  resolveRequestIdentity,
} from "@/lib/security/request-identity";

describe("anonymous abuse-prevention identity", () => {
  it("uses an opaque HttpOnly SameSite cookie without exposing the client IP", () => {
    const request = new Request("https://example.test/novel/story/chapter/1", {
      headers: { "x-real-ip": "203.0.113.7" },
    });
    const identity = resolveRequestIdentity(request);
    const response = attachAnonymousSessionCookie(NextResponse.next(), identity);
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(identity.subjectHash).not.toContain("203.0.113.7");
    expect(cookie).toContain(`${ANONYMOUS_SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
  });
});
