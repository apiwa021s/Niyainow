import { describe, expect, it } from "vitest";

import { selectTranslationGenreContext } from "./translation-genre-context";

describe("translation genre context", () => {
  it("selects cultivation guidance from Thai genre analysis", () => {
    const context = selectTranslationGenreContext({
      genre: "จีนแฟนตาซีบำเพ็ญเซียน",
      subgenres: ["กำลังภายใน"],
      tone: "จริงจัง",
      targetLanguage: "th",
    });
    expect(context.key).toBe("cultivation");
    expect(context.guidance).toContain("Thai localization quality rules");
    expect(context.guidance).toContain("cultivation realms");
  });

  it("does not inject Thai-specific rules into other target languages", () => {
    const context = selectTranslationGenreContext({
      genre: "modern romance",
      subgenres: [],
      tone: "warm",
      targetLanguage: "id",
    });
    expect(context.key).toBe("romance");
    expect(context.guidance).not.toContain("Thai localization quality rules");
  });

  it("falls back safely when the genre is unfamiliar", () => {
    expect(selectTranslationGenreContext({ genre: "experimental", subgenres: [], tone: "quiet", targetLanguage: "th" }).key)
      .toBe("general-fiction");
  });
});
