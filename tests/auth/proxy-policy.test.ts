import { describe, expect, it } from "vitest";

import { decideProxyAccess } from "@/lib/auth/proxy-policy";

describe("Proxy access policy", () => {
  it("keeps the anonymous admin login entry point public", () => {
    expect(decideProxyAccess("/admin/login", null)).toEqual({ kind: "allow" });
  });

  it("routes an anonymous admin request through one public login hop", () => {
    expect(decideProxyAccess("/admin", null)).toEqual({
      kind: "redirect",
      login: "admin",
    });
    expect(decideProxyAccess("/admin/login", null)).toEqual({ kind: "allow" });
  });

  it("allows an active editor into admin routes", () => {
    expect(
      decideProxyAccess("/admin/novels", {
        role: "EDITOR",
        status: "ACTIVE",
      }),
    ).toEqual({ kind: "allow" });
  });

  it("fails closed for readers and disabled users", () => {
    expect(
      decideProxyAccess("/admin", {
        role: "READER",
        status: "ACTIVE",
      }),
    ).toEqual({ kind: "redirect", login: "admin", error: "AccessDenied" });

    expect(
      decideProxyAccess("/library", {
        role: "READER",
        status: "SUSPENDED",
      }),
    ).toEqual({ kind: "redirect", login: "reader", error: "AccountDisabled" });
  });

  it("protects Studio for writers without requiring an admin role", () => {
    expect(decideProxyAccess("/studio/works", null)).toEqual({
      kind: "redirect",
      login: "reader",
    });
    expect(
      decideProxyAccess("/studio/works", {
        role: "READER",
        status: "ACTIVE",
      }),
    ).toEqual({ kind: "allow" });
  });
});
