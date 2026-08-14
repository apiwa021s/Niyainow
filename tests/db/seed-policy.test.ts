import { describe, expect, it } from "vitest";

import { assertDevelopmentSeedAllowed } from "@/db/seed-policy";

describe("development seed policy", () => {
  it("fails closed unless an operator explicitly opts in", () => {
    expect(() => assertDevelopmentSeedAllowed({})).toThrow(/ALLOW_DEVELOPMENT_SEED/u);
    expect(() => assertDevelopmentSeedAllowed({ NODE_ENV: "development" })).toThrow(/ALLOW_DEVELOPMENT_SEED/u);
  });

  it("allows an explicit non-production development seed", () => {
    expect(() =>
      assertDevelopmentSeedAllowed({ NODE_ENV: "development", ALLOW_DEVELOPMENT_SEED: "true" }),
    ).not.toThrow();
  });

  it("always rejects production even if the opt-in flag is present", () => {
    expect(() =>
      assertDevelopmentSeedAllowed({ NODE_ENV: "production", ALLOW_DEVELOPMENT_SEED: "true" }),
    ).toThrow(/disabled/u);
  });
});
