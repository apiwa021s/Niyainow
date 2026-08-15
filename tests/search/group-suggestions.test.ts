import { describe, expect, it } from "vitest";

import {
  flattenGroupedSearchSuggestions,
  groupSearchSuggestions,
  type SearchSuggestion,
} from "@/lib/search/group-suggestions";

describe("groupSearchSuggestions", () => {
  it("assigns option indices in the same order as the grouped DOM", () => {
    const suggestions: SearchSuggestion[] = [
      { kind: "author", label: "ผู้แต่ง ก", meta: "", href: "/search?q=author" },
      { kind: "translator", label: "ผู้แปล ก", meta: "", href: "/search?q=translator" },
      { kind: "tag", label: "แท็ก ก", meta: "", href: "/tag/tag-a" },
      { kind: "novel", label: "นิยาย ก", meta: "", href: "/novel/novel-a" },
      { kind: "genre", label: "แนว ก", meta: "", href: "/genre/genre-a" },
      { kind: "novel", label: "นิยาย ข", meta: "", href: "/novel/novel-b" },
    ];

    const groups = groupSearchSuggestions(suggestions);

    expect(groups.map((group) => group.kind)).toEqual(["novels", "authors", "translators", "genres", "tags"]);
    expect(groups.flatMap((group) => group.items.map(({ index }) => index))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(flattenGroupedSearchSuggestions(groups).map((option) => option.label)).toEqual([
      "นิยาย ก",
      "นิยาย ข",
      "ผู้แต่ง ก",
      "ผู้แปล ก",
      "แนว ก",
      "แท็ก ก",
    ]);
  });

  it("infers legacy genre and tag suggestions from their href", () => {
    const groups = groupSearchSuggestions([
      { label: "แท็ก", meta: "", href: "/tag/fantasy" },
      { label: "หมวด", meta: "", href: "/genre/fantasy" },
      { label: "นิยาย", meta: "", href: "/novel/fantasy" },
    ]);

    expect(groups.map((group) => group.kind)).toEqual(["novels", "genres", "tags"]);
  });
});
