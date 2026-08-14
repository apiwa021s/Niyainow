import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({ recordPublicView: vi.fn() }));

vi.mock("@/services/novel-service", () => ({
  recordPublicView: serviceMocks.recordPublicView,
}));

import { POST } from "@/app/api/events/view/route";

function viewRequest(
  body: unknown,
  options: { origin?: string; address?: string; userAgent?: string } = {},
) {
  const origin = options.origin ?? "https://example.com";
  return new Request("https://example.com/api/events/view", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "sec-fetch-site": origin === "https://example.com" ? "same-origin" : "cross-site",
      "x-real-ip": options.address ?? `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
      "user-agent": options.userAgent ?? "vitest-browser",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events/view", () => {
  beforeEach(() => {
    serviceMocks.recordPublicView.mockReset();
    serviceMocks.recordPublicView.mockResolvedValue(true);
  });

  it("records a bounded public chapter event", async () => {
    const response = await POST(viewRequest({
      slug: "sample-novel",
      chapterNumber: 1.5,
      clientToken: crypto.randomUUID(),
    }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ data: { recorded: true, duplicate: false } });
    expect(serviceMocks.recordPublicView).toHaveBeenCalledWith(expect.objectContaining({
      slug: "sample-novel",
      chapterNumber: 1.5,
      uniqueNovelReader: true,
    }));
  });

  it("suppresses a repeated resource event before the database writer", async () => {
    const token = crypto.randomUUID();
    const address = "203.0.113.210";
    const payload = { slug: `duplicate-${token.slice(0, 8)}`, chapterNumber: 2, clientToken: token };
    const first = await POST(viewRequest(payload, { address }));
    const duplicate = await POST(viewRequest(payload, { address }));

    expect(first.status).toBe(202);
    expect(duplicate.status).toBe(202);
    await expect(duplicate.json()).resolves.toEqual({ data: { recorded: false, duplicate: true } });
    expect(serviceMocks.recordPublicView).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-origin and malformed events", async () => {
    const crossOrigin = await POST(viewRequest(
      { slug: "sample-novel", clientToken: crypto.randomUUID() },
      { origin: "https://attacker.example" },
    ));
    const malformed = await POST(viewRequest({
      slug: "Sample Novel",
      chapterNumber: 1.234,
      clientToken: crypto.randomUUID(),
    }));

    expect(crossOrigin.status).toBe(403);
    expect(malformed.status).toBe(400);
    expect(serviceMocks.recordPublicView).not.toHaveBeenCalled();
  });

  it("rolls back dedupe when published content is not found", async () => {
    serviceMocks.recordPublicView.mockResolvedValue(false);
    const token = crypto.randomUUID();
    const payload = { slug: `missing-${token.slice(0, 8)}`, clientToken: token };
    const options = { address: "203.0.113.211" };
    const first = await POST(viewRequest(payload, options));
    const retry = await POST(viewRequest(payload, options));

    expect(first.status).toBe(404);
    expect(retry.status).toBe(404);
    expect(serviceMocks.recordPublicView).toHaveBeenCalledTimes(2);
  });
});
