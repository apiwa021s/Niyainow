import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({ assertTranslationPermission: vi.fn() }));

import { bulkPublishTranslationSchema } from "@/services/translation-service";

function chapterId(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

describe("translation bulk publish validation", () => {
  it("accepts one to 100 unique chapter IDs", () => {
    expect(bulkPublishTranslationSchema.safeParse({ chapterIds: [chapterId(1)] }).success).toBe(true);
    expect(bulkPublishTranslationSchema.safeParse({ chapterIds: Array.from({ length: 100 }, (_, index) => chapterId(index)) }).success).toBe(true);
  });

  it("rejects empty, duplicate, invalid, and oversized selections", () => {
    expect(bulkPublishTranslationSchema.safeParse({ chapterIds: [] }).success).toBe(false);
    expect(bulkPublishTranslationSchema.safeParse({ chapterIds: [chapterId(1), chapterId(1)] }).success).toBe(false);
    expect(bulkPublishTranslationSchema.safeParse({ chapterIds: ["not-a-uuid"] }).success).toBe(false);
    expect(bulkPublishTranslationSchema.safeParse({ chapterIds: Array.from({ length: 101 }, (_, index) => chapterId(index)) }).success).toBe(false);
  });
});
