import { describe, expect, it } from "vitest";

import { mapImportedChapterAccess } from "@/db/import-translated-novels";

describe("translated novel import", () => {
  it("imports paid Mongo chapters as one-coin Postgres chapters", () => {
    expect(mapImportedChapterAccess(20)).toEqual({ isFree: false, coinPrice: 1 });
    expect(mapImportedChapterAccess(1)).toEqual({ isFree: false, coinPrice: 1 });
  });

  it("keeps free or malformed Mongo prices free", () => {
    expect(mapImportedChapterAccess(0)).toEqual({ isFree: true, coinPrice: 0 });
    expect(mapImportedChapterAccess(null)).toEqual({ isFree: true, coinPrice: 0 });
  });
});
