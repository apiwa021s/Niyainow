import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ assertAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import {
  adminBannerInputSchema,
  adminChapterInputSchema,
  adminGenreInputSchema,
  adminNovelInputSchema,
  adminReviewModerationSchema,
  assertReviewRevision,
  chapterAuditSnapshot,
  reviewAuditSnapshot,
} from "@/services/admin-service";

const chapter = {
  novelSlug: "stable-story",
  chapterNumber: 10.5,
  sortOrder: 11,
  title: "Interlude",
  content: "Published content",
  excerpt: null,
  status: "PUBLISHED" as const,
  isFree: true as const,
  coinPrice: 0 as const,
  scheduledFor: null,
};

describe("admin chapter validation", () => {
  it("supports decimal chapter numbers with an explicit independent sort order", () => {
    expect(adminChapterInputSchema.parse(chapter)).toMatchObject({ chapterNumber: 10.5, sortOrder: 11 });
    expect(adminChapterInputSchema.safeParse({ ...chapter, chapterNumber: 10.123 }).success).toBe(false);
  });

  it("rejects paid chapters while commerce and entitlements are disabled", () => {
    expect(adminChapterInputSchema.safeParse({ ...chapter, isFree: false, coinPrice: 15 }).success).toBe(false);
  });

  it("requires a future timestamp for scheduled publication", () => {
    expect(adminChapterInputSchema.safeParse({ ...chapter, status: "SCHEDULED", scheduledFor: null }).success).toBe(false);
    expect(
      adminChapterInputSchema.safeParse({ ...chapter, status: "SCHEDULED", scheduledFor: "2020-01-01T00:00:00.000Z" }).success,
    ).toBe(false);
  });

  it("rejects content that would create an unbounded paragraph-node render", () => {
    const excessiveParagraphs = Array.from({ length: 5_001 }, () => "x").join("\n\n");
    expect(adminChapterInputSchema.safeParse({ ...chapter, content: excessiveParagraphs }).success).toBe(false);
  });

  it("stores only manuscript metadata and a digest in audit payloads", () => {
    const snapshot = chapterAuditSnapshot({
      novelId: "00000000-0000-4000-8000-000000000001",
      chapterNumber: 1,
      sortOrder: 1,
      slug: "chapter-1",
      title: "Chapter one",
      content: "private manuscript text",
      excerpt: "short excerpt",
      wordCount: 3,
      status: "DRAFT",
      isFree: true,
      coinPrice: 0,
      scheduledFor: null,
      publishedAt: null,
      deletedAt: null,
    });
    expect(snapshot).not.toHaveProperty("content");
    expect(snapshot).not.toHaveProperty("excerpt");
    expect(snapshot.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.contentLength).toBe("private manuscript text".length);
  });
});

describe("admin novel validation", () => {
  const novel = {
    title: "A production story",
    titleOriginal: null,
    synopsis: "A synopsis long enough to pass editorial validation.",
    authorNames: ["Writer"],
    genreIds: ["00000000-0000-4000-8000-000000000001"],
    tagNames: ["Adventure"],
    status: "ONGOING" as const,
    publicationStatus: "DRAFT" as const,
    contentRating: "TEEN" as const,
    isFeatured: false,
    coverKey: null,
    bannerKey: null,
    scheduledFor: null,
  };

  it("does not require a user-provided slug and rejects URL media fields", () => {
    expect(adminNovelInputSchema.safeParse(novel).success).toBe(true);
    expect(adminNovelInputSchema.safeParse({ ...novel, coverKey: "https://example.com/cover.jpg" }).success).toBe(false);
  });
});

describe("review moderation validation", () => {
  it("only accepts terminal/public moderation states and a bounded note", () => {
    const expectedUpdatedAt = "2026-08-14T01:02:03.000Z";
    expect(adminReviewModerationSchema.safeParse({ status: "PUBLISHED", note: "ผ่านการตรวจ", expectedUpdatedAt }).success).toBe(true);
    expect(adminReviewModerationSchema.safeParse({ status: "PENDING", expectedUpdatedAt }).success).toBe(false);
    expect(adminReviewModerationSchema.safeParse({ status: "REJECTED", note: "x".repeat(1_001), expectedUpdatedAt }).success).toBe(false);
    expect(adminReviewModerationSchema.safeParse({ status: "HIDDEN" }).success).toBe(false);
  });

  it("rejects moderation of a stale review revision with HTTP conflict semantics", () => {
    expect(() => assertReviewRevision("2026-08-14T01:02:03.000Z", new Date("2026-08-14T01:02:04.000Z"))).toThrowError(
      expect.objectContaining({ code: "REVIEW_REVISION_CONFLICT", status: 409 }),
    );
    expect(() => assertReviewRevision("2026-08-14T01:02:03.000Z", new Date("2026-08-14T01:02:03.000Z"))).not.toThrow();
  });

  it("does not copy user review content into the audit payload", () => {
    const snapshot = reviewAuditSnapshot({
      userId: "00000000-0000-4000-8000-000000000001",
      novelId: "00000000-0000-4000-8000-000000000002",
      title: "Private title",
      body: "review body that must not be stored twice",
      status: "PENDING",
      isSpoiler: true,
      likeCount: 0,
      moderationNote: "internal moderation note",
      moderatedBy: null,
      moderatedAt: null,
      deletedAt: null,
    });
    expect(snapshot).not.toHaveProperty("body");
    expect(snapshot).not.toHaveProperty("title");
    expect(snapshot).not.toHaveProperty("moderationNote");
    expect(snapshot.bodySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.moderationNoteLength).toBe("internal moderation note".length);
  });
});

describe("admin genre validation", () => {
  const genre = {
    name: "Urban Fantasy",
    thaiName: "แฟนตาซีเมือง",
    description: "Magic hidden in a modern city.",
    sortOrder: 10,
    isActive: true,
  };

  it("accepts production taxonomy fields and does not accept caller-controlled slugs", () => {
    expect(adminGenreInputSchema.safeParse(genre).success).toBe(true);
    expect(adminGenreInputSchema.safeParse({ ...genre, slug: "caller-controlled" }).success).toBe(false);
  });

  it("requires bounded names and a non-negative integer sort order", () => {
    expect(adminGenreInputSchema.safeParse({ ...genre, name: "x" }).success).toBe(false);
    expect(adminGenreInputSchema.safeParse({ ...genre, sortOrder: -1 }).success).toBe(false);
    expect(adminGenreInputSchema.safeParse({ ...genre, sortOrder: 1.5 }).success).toBe(false);
  });
});

describe("admin banner validation", () => {
  const banner = {
    title: "อ่านฟรีสัปดาห์นี้",
    subtitle: "รวมเรื่องเปิดให้อ่านฟรีถึงสิ้นเดือน",
    imageKey: "banners/2f6d1c8a-3b4e-4d5f-8a9b-0c1d2e3f4a5b.webp",
    linkUrl: "/novels?status=completed",
    ctaLabel: "อ่านเลย",
    sortOrder: 1,
    isActive: true,
    startsAt: null,
    endsAt: null,
  };

  it("accepts a verified banner object key and rejects other media prefixes", () => {
    expect(adminBannerInputSchema.safeParse(banner).success).toBe(true);
    expect(adminBannerInputSchema.safeParse({ ...banner, imageKey: banner.imageKey.replace("banners/", "covers/") }).success).toBe(false);
    expect(adminBannerInputSchema.safeParse({ ...banner, imageKey: "" }).success).toBe(false);
  });

  it("only stores same-origin paths or http(s) links so the renderer cannot emit a script url", () => {
    expect(adminBannerInputSchema.safeParse({ ...banner, linkUrl: "https://example.com/promo" }).success).toBe(true);
    expect(adminBannerInputSchema.parse({ ...banner, linkUrl: "" }).linkUrl).toBeNull();
    expect(adminBannerInputSchema.safeParse({ ...banner, linkUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(adminBannerInputSchema.safeParse({ ...banner, linkUrl: "//evil.example.com" }).success).toBe(false);
  });

  it("requires the schedule window to end after it starts", () => {
    const startsAt = "2026-09-01T00:00:00+07:00";
    expect(adminBannerInputSchema.safeParse({ ...banner, startsAt, endsAt: "2026-09-08T00:00:00+07:00" }).success).toBe(true);
    expect(adminBannerInputSchema.safeParse({ ...banner, startsAt, endsAt: "2026-08-08T00:00:00+07:00" }).success).toBe(false);
  });
});
