import { describe, expect, it } from "vitest";

import { toPublicChapterCachePayload } from "@/lib/domain/chapter-cache";

const chapter = {
  id: "7a416c7f-1e68-48ed-a673-4308d2fbe5d0",
  novelSlug: "security-fixture",
  number: 12,
  title: "Paid chapter",
  updatedAt: "2026-09-11T00:00:00.000Z",
};

describe("premium chapter public cache boundary", () => {
  it("copies only explicit metadata and the editorial excerpt", () => {
    const premiumSentence = "UNIQUE_PREMIUM_SENTENCE_MUST_NEVER_CROSS_PUBLIC_CACHE";
    const source = {
      chapter,
      isFree: false,
      publicContent: "Editorial teaser only",
      content: premiumSentence,
      body: premiumSentence,
    };
    const payload = toPublicChapterCachePayload(source);
    const serialized = JSON.stringify(payload);
    expect(payload).toEqual({ chapter, content: "Editorial teaser only", locked: true });
    expect(serialized).not.toContain(premiumSentence);
    expect(serialized).not.toContain('"body"');
  });
});
