import { describe, expect, it } from "vitest";

import { buildDefaultTranslationProfile } from "./translation-profile";

describe("default translation profile", () => {
  it("uses only the title, synopsis, and language pair to build the initial profile", () => {
    const profile = buildDefaultTranslationProfile({
      title: "Return of the Immortal Sword Master",
      synopsis: "A fallen cultivator returns to his former sect.",
      sourceLanguage: "en",
      targetLanguage: "th",
    });

    expect(profile.name).toContain("Return of the Immortal Sword Master");
    expect(profile.styleGuide).toContain("กำลังภายใน / บำเพ็ญเพียร");
    expect(profile.instructions).toContain("A fallen cultivator");
    expect(profile.preserveParagraphs).toBe(true);
  });

  it("handles missing synopsis without inventing story details", () => {
    const profile = buildDefaultTranslationProfile({
      title: "Untitled Journey",
      sourceLanguage: "en",
      targetLanguage: "th",
    });

    expect(profile.instructions).toContain("ไม่มีเรื่องย่อจากต้นฉบับ");
    expect(profile.signals).toEqual([]);
  });
});
