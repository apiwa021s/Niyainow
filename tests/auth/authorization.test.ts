import { describe, expect, it } from "vitest";

import { canAccessAdmin, isActiveUser } from "@/lib/auth/permissions";
import { safeLoginCallback, safeRedirectPath } from "@/lib/auth/redirects";

describe("authorization policy", () => {
  it("requires an active account for every privileged role", () => {
    expect(canAccessAdmin({ role: "ADMIN", status: "ACTIVE" })).toBe(true);
    expect(canAccessAdmin({ role: "EDITOR", status: "ACTIVE" })).toBe(true);
    expect(canAccessAdmin({ role: "READER", status: "ACTIVE" })).toBe(false);
    expect(canAccessAdmin({ role: "ADMIN", status: "SUSPENDED" })).toBe(false);
    expect(canAccessAdmin({ role: "EDITOR", status: "BANNED" })).toBe(false);
    expect(isActiveUser({ status: "DELETED" })).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("preserves local paths with query and hash", () => {
    expect(safeRedirectPath("/novel/story?from=login#chapter", "/")).toBe("/novel/story?from=login#chapter");
  });

  it("rejects absolute, protocol-relative, and malformed targets", () => {
    expect(safeRedirectPath("https://attacker.example", "/profile")).toBe("/profile");
    expect(safeRedirectPath("//attacker.example/path", "/profile")).toBe("/profile");
    expect(safeRedirectPath("javascript:alert(1)", "/profile")).toBe("/profile");
  });

  it("prevents login callback loops", () => {
    expect(safeLoginCallback("/login?error=OAuth", "/profile")).toBe("/profile");
    expect(safeLoginCallback("/admin/login", "/admin")).toBe("/admin");
    expect(safeLoginCallback("/studio/works", "/profile")).toBe("/studio/works");
  });
});
