import { describe, expect, it } from "vitest";

import { bangkokDateKey, hashPublicViewer, PublicViewDedupe } from "@/lib/domain/public-view";

describe("public view aggregation helpers", () => {
  it("uses Bangkok calendar boundaries", () => {
    expect(bangkokDateKey(new Date("2026-08-14T16:59:59.999Z"))).toBe("2026-08-14");
    expect(bangkokDateKey(new Date("2026-08-14T17:00:00.000Z"))).toBe("2026-08-15");
  });

  it("hashes viewer inputs without exposing raw identifiers", () => {
    const first = hashPublicViewer({
      address: "203.0.113.42",
      userAgent: "test-browser",
      clientToken: "4b5a3224-a7a2-4d86-b6d2-2eb4362bc913",
      pepper: "test-pepper",
    });
    const second = hashPublicViewer({
      address: "203.0.113.42",
      userAgent: "test-browser",
      clientToken: "4b5a3224-a7a2-4d86-b6d2-2eb4362bc913",
      pepper: "test-pepper",
    });
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(first).not.toContain("203.0.113.42");
  });

  it("accepts one event per resource/day while counting one unique novel reader", () => {
    const dedupe = new PublicViewDedupe(10);
    const base = { fingerprint: "viewer", slug: "sample-novel", now: new Date("2026-08-14T12:00:00Z") };
    const novel = dedupe.reserve(base);
    const repeatedNovel = dedupe.reserve(base);
    const chapter = dedupe.reserve({ ...base, chapterNumber: 1 });

    expect(novel).toMatchObject({ accepted: true, uniqueNovelReader: true });
    expect(repeatedNovel).toEqual({ accepted: false, uniqueNovelReader: false });
    expect(chapter).toMatchObject({ accepted: true, uniqueNovelReader: false });
  });

  it("allows a failed reservation to be retried", () => {
    const dedupe = new PublicViewDedupe(10);
    const input = { fingerprint: "viewer", slug: "sample-novel", chapterNumber: 2, now: new Date("2026-08-14T12:00:00Z") };
    const reservation = dedupe.reserve(input);
    dedupe.rollback(reservation);
    expect(dedupe.reserve(input)).toMatchObject({ accepted: true, uniqueNovelReader: true });
  });
});
