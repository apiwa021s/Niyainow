import { describe, expect, it } from "vitest";

import { studioStoryInputSchema } from "@/services/studio-service";

const validStory = {
  title: "เรื่องทดสอบ",
  tagline: null,
  synopsis: "เรื่องย่อสำหรับทดสอบการเลือกแนวนิยาย",
  coverKey: null,
  primaryGenreId: "sci-fi",
  secondaryGenreIds: ["martial-arts", "slice-of-life"],
  relationshipIds: ["mf"],
  settingIds: [],
  tropeIds: ["slow_burn"],
  contentWarningIds: [],
  storyType: "serial" as const,
  storyStatus: "ongoing" as const,
  originType: "original" as const,
  originalTitle: null,
  rightsHolder: null,
  rightsNote: null,
  rightsDocumentReference: null,
  rightsConfirmed: true as const,
  contentPolicyConfirmed: true as const,
};

describe("studio genre validation", () => {
  it("accepts standard URL-style genre slugs alongside underscore taxonomy slugs", () => {
    expect(studioStoryInputSchema.safeParse(validStory).success).toBe(true);
  });

  it("rejects malformed genre slugs", () => {
    expect(studioStoryInputSchema.safeParse({ ...validStory, primaryGenreId: "Sci Fi" }).success).toBe(false);
  });
});
