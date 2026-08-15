import { describe, expect, it } from "vitest";

import {
  collectionPageHref,
  collectionPagination,
  parseCollectionPage,
} from "@/lib/validation/collection-pagination";

describe("collection pagination", () => {
  it("accepts only one positive safe page number", () => {
    expect(parseCollectionPage("3")).toBe(3);
    expect(parseCollectionPage("0")).toBe(1);
    expect(parseCollectionPage("not-a-page")).toBe(1);
    expect(parseCollectionPage(["2", "3"])).toBe(1);
    expect(parseCollectionPage(String(Number.MAX_SAFE_INTEGER + 1))).toBe(1);
  });

  it("clamps the requested page to an honest count-derived final page", () => {
    expect(collectionPagination(49, 99, 24)).toEqual({
      page: 3,
      pageSize: 24,
      total: 49,
      totalPages: 3,
    });
    expect(collectionPagination(0, 4, 24)).toEqual({
      page: 1,
      pageSize: 24,
      total: 0,
      totalPages: 1,
    });
  });

  it("omits the default page from collection links", () => {
    expect(collectionPageHref("/library", 1)).toBe("/library");
    expect(collectionPageHref("/history", 2)).toBe("/history?page=2");
  });
});
