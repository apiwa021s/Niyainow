import { describe, expect, it } from "vitest";

import { serializeJsonLd, truncateDescription } from "@/lib/seo";

describe("SEO helpers", () => {
  it("normalizes and bounds descriptions", () => {
    expect(truncateDescription("  one\n two  ", 20)).toBe("one two");
    expect(truncateDescription("abcdefghij", 6)).toBe("abcde…");
  });

  it("cannot close the JSON-LD script element", () => {
    expect(serializeJsonLd({ title: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});
