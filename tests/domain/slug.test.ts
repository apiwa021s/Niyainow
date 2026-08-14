import { describe, expect, it } from "vitest";

import { createUniqueSlug, slugify } from "@/lib/validation/slug";

describe("slugify", () => {
  it("normalizes punctuation and whitespace", () => {
    expect(slugify("  Shadow  Sovereign: Reborn!  ")).toBe("shadow-sovereign-reborn");
  });

  it("creates a stable ASCII fallback for Thai-only titles", () => {
    const first = slugify("จอมเวท แห่ง รัตติกาล");
    expect(first).toMatch(/^item-[a-z0-9]+$/);
    expect(slugify("จอมเวท แห่ง รัตติกาล")).toBe(first);
  });

  it("uses a safe fallback", () => {
    expect(slugify("---", "novel")).toMatch(/^novel-[a-z0-9]+$/);
  });
});

describe("createUniqueSlug", () => {
  it("adds a deterministic numeric suffix", async () => {
    const taken = new Set(["shadow", "shadow-2"]);
    await expect(createUniqueSlug("Shadow", async (candidate) => taken.has(candidate))).resolves.toBe("shadow-3");
  });
});
