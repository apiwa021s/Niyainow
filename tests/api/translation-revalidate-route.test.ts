import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCronEnv: vi.fn(),
  invalidatePublishedTranslations: vi.fn(),
  error: vi.fn(),
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/env", () => ({ requireCronEnv: mocks.requireCronEnv }));
vi.mock("@/lib/logger", () => ({ logger: { child: () => ({}), error: mocks.error } }));
vi.mock("@/services/translation-service", () => ({ invalidatePublishedTranslations: mocks.invalidatePublishedTranslations }));

import { POST } from "@/app/api/internal/translation-revalidate/route";

const secret = "internal-revalidation-secret-at-least-32-characters";
function request(body: unknown, authorization = `Bearer ${secret}`, headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/internal/translation-revalidate", {
    method: "POST",
    headers: { "content-type": "application/json", authorization, ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCronEnv.mockReturnValue({ CRON_SECRET: secret });
  mocks.invalidatePublishedTranslations.mockResolvedValue(undefined);
});

describe("POST /api/internal/translation-revalidate", () => {
  it("requires the exact internal bearer credential before invalidating caches", async () => {
    for (const authorization of ["", "Bearer wrong-secret", `Basic ${secret}`]) {
      const response = await POST(request({ novelSlugs: ["sample-novel"] }, authorization));
      expect(response.status).toBe(401);
    }
    expect(mocks.invalidatePublishedTranslations).not.toHaveBeenCalled();
  });

  it("revalidates only validated novel slugs and marks the response private", async () => {
    const response = await POST(request({ novelSlugs: ["sample-novel", "sample-novel"] }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    await expect(response.json()).resolves.toEqual({ data: { invalidated: true } });
    expect(mocks.invalidatePublishedTranslations).toHaveBeenCalledExactlyOnceWith([{ novelSlug: "sample-novel" }]);
  });

  it.each([
    { novelSlugs: [] },
    { novelSlugs: ["../admin"] },
    { novelSlugs: ["sample-novel"], path: "/admin" },
    { novelSlugs: Array.from({ length: 101 }, () => "sample-novel") },
  ])("rejects invalid and arbitrary revalidation payloads", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.invalidatePublishedTranslations).not.toHaveBeenCalled();
  });

  it("rejects oversized or unsupported bodies", async () => {
    expect((await POST(request({ novelSlugs: ["sample-novel"] }, undefined, { "content-length": "24001" }))).status).toBe(413);
    expect((await POST(request({ novelSlugs: ["sample-novel"] }, undefined, { "content-type": "text/plain" }))).status).toBe(415);
    expect(mocks.invalidatePublishedTranslations).not.toHaveBeenCalled();
  });

  it("enforces the actual body limit without trusting content-length and rejects malformed JSON", async () => {
    const headers = { authorization: `Bearer ${secret}`, "content-type": "application/json" };
    const oversized = new Request("https://example.com/api/internal/translation-revalidate", {
      method: "POST", headers, body: " ".repeat(24_001),
    });
    const malformed = new Request("https://example.com/api/internal/translation-revalidate", {
      method: "POST", headers, body: "{",
    });
    expect((await POST(oversized)).status).toBe(413);
    expect((await POST(malformed)).status).toBe(400);
    expect(mocks.invalidatePublishedTranslations).not.toHaveBeenCalled();
  });

  it("reports unavailable configuration and revalidation failures without exposing credentials", async () => {
    mocks.requireCronEnv.mockImplementationOnce(() => { throw new Error(secret); });
    const unconfigured = await POST(request({ novelSlugs: ["sample-novel"] }));
    expect(unconfigured.status).toBe(503);
    expect(await unconfigured.text()).not.toContain(secret);

    mocks.invalidatePublishedTranslations.mockRejectedValueOnce(new Error(secret));
    const failed = await POST(request({ novelSlugs: ["sample-novel"] }));
    expect(failed.status).toBe(500);
    expect(await failed.text()).not.toContain(secret);
    expect(JSON.stringify(mocks.error.mock.calls)).not.toContain(secret);
  });
});
