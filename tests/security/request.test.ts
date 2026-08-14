import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/security/request";

describe("assertSameOrigin", () => {
  it("accepts same-origin browser mutations", () => {
    const request = new Request("https://example.com/api/me/library", {
      method: "PUT",
      headers: { origin: "https://example.com", "sec-fetch-site": "same-origin" },
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("rejects absent and cross-site origins", () => {
    expect(() => assertSameOrigin(new Request("https://example.com/api/me/library", { method: "PUT" }))).toThrow(ApiError);
    expect(() =>
      assertSameOrigin(
        new Request("https://example.com/api/me/library", {
          method: "PUT",
          headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
        }),
      ),
    ).toThrow(ApiError);
  });
});
