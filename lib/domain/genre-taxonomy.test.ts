import { describe, expect, it } from "vitest";

import { canonicalGenreSlug } from "./genre-taxonomy";

describe("genre taxonomy normalization", () => {
  it.each([
    ["dark_romance", "romance"],
    ["crime-thriller", "thriller"],
    ["scifi_apocalypse", "apocalypse"],
    ["xianxia", "martial-arts"],
    ["school-life", "slice-of-life"],
    ["online-game", "system"],
  ])("maps %s to %s", (source, expected) => {
    expect(canonicalGenreSlug(source)).toBe(expected);
  });

  it("keeps an existing standard slug", () => {
    expect(canonicalGenreSlug("fantasy")).toBe("fantasy");
  });
});
