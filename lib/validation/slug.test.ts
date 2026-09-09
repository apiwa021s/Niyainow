import { describe, expect, it } from "vitest";

import { createUniqueSlug, selectReadableSlugSource, slugify, slugSchema, withSlugSuffix } from "./slug";

describe("slug utilities", () => {
  it("normalizes Latin titles into safe stable slugs", () => {
    expect(slugify("  Café & The King's Road  ")).toBe("cafe-and-the-kings-road");
  });

  it("creates a deterministic non-empty fallback for Thai-only titles", () => {
    const first = slugify("ราชันเงา", "novel");
    expect(first).toBe(slugify("ราชันเงา", "novel"));
    expect(first).toMatch(/^novel-[a-z0-9]+$/);
    expect(slugSchema.safeParse(first).success).toBe(true);
  });

  it("uses the original title when a localized title cannot create a readable ASCII slug", () => {
    expect(selectReadableSlugSource("กลุ่มแชตบำเพ็ญเซียน", "Cultivation Chat Group")).toBe("Cultivation Chat Group");
    expect(selectReadableSlugSource("Solo Leveling ฉบับไทย", "Solo Leveling")).toBe("Solo Leveling ฉบับไทย");
  });

  it("resolves conflicts without exceeding the maximum length", async () => {
    const occupied = new Set(["shadow-king", "shadow-king-2"]);
    await expect(createUniqueSlug("Shadow King", (slug) => occupied.has(slug), "novel")).resolves.toBe(
      "shadow-king-3",
    );
    expect(withSlugSuffix("a".repeat(180), 10)).toHaveLength(180);
  });
});
