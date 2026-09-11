import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";

describe("cron request authentication", () => {
  const secret = "a-production-cron-secret-at-least-32-characters";

  it("accepts only the exact bearer secret", () => {
    const request = new Request("https://example.com/api/cron/publishing", {
      headers: { authorization: `Bearer ${secret}` },
    });
    expect(isAuthorizedCronRequest(request, secret)).toBe(true);
  });

  it.each([
    undefined,
    `Basic ${secret}`,
    "Bearer wrong-secret",
    `Bearer ${secret} trailing`,
  ])("rejects an invalid authorization header", (authorization) => {
    const headers = authorization ? { authorization } : undefined;
    expect(isAuthorizedCronRequest(new Request("https://example.com", { headers }), secret)).toBe(false);
  });
});
