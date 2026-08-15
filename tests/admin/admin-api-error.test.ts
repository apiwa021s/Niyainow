import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loggerError: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    readonly code = "AUTHENTICATION_REQUIRED";
  },
  AuthorizationDeniedError: class AuthorizationDeniedError extends Error {
    readonly code = "AUTHORIZATION_DENIED";
  },
  assertAdmin: vi.fn(),
}));
vi.mock("@/services/admin-service", () => ({
  AdminDataError: class AdminDataError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly status: number,
    ) {
      super(message);
    }
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.loggerError } }));

import { adminApiError } from "@/app/api/admin/_shared";

describe("admin API fallback logging", () => {
  beforeEach(() => {
    mocks.loggerError.mockReset();
  });

  it("records a bounded stack and request routing context without query data", async () => {
    const request = new Request("https://example.com/api/admin/chapters/chapter-id?token=must-not-log", {
      method: "PATCH",
      headers: { "x-vercel-id": "sin1::request-123" },
    });
    const error = new RangeError("Maximum call stack size exceeded");

    const response = adminApiError(error, request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INTERNAL_ERROR", message: "ระบบไม่สามารถดำเนินการได้ในขณะนี้" },
    });
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "Unhandled admin API error",
      expect.objectContaining({
        method: "PATCH",
        route: "/api/admin/chapters/chapter-id",
        requestId: "sin1::request-123",
        error,
        errorStack: expect.stringContaining("RangeError: Maximum call stack size exceeded"),
      }),
    );
    expect(JSON.stringify(mocks.loggerError.mock.calls)).not.toContain("must-not-log");
  });
});
