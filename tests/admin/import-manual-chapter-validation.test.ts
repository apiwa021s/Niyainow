import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ assertAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { adminImportManualChapterSchema } from "@/services/admin-import-service";

const validChapter = {
  chapterNumber: 504,
  originalTitle: "第504章 กลับมาอีกครั้ง",
  sourceUrl: "https://twkan.com/txt/93323/52116657",
  originalText: "ย่อหน้าแรก\n\nย่อหน้าที่สอง",
  replaceExisting: false,
};

describe("admin manual import chapter validation", () => {
  it("accepts a bounded text chapter and trims manuscript fields", () => {
    expect(adminImportManualChapterSchema.parse({
      ...validChapter,
      originalTitle: `  ${validChapter.originalTitle}  `,
      originalText: `  ${validChapter.originalText}  `,
    })).toMatchObject(validChapter);
  });

  it("rejects blank text, fractional chapter numbers, and unexpected fields", () => {
    expect(adminImportManualChapterSchema.safeParse({ ...validChapter, originalText: "   " }).success).toBe(false);
    expect(adminImportManualChapterSchema.safeParse({ ...validChapter, chapterNumber: 504.5 }).success).toBe(false);
    expect(adminImportManualChapterSchema.safeParse({ ...validChapter, actorId: "caller-controlled" }).success).toBe(false);
  });

  it("requires credential-free HTTPS except for loopback development URLs", () => {
    expect(adminImportManualChapterSchema.safeParse({ ...validChapter, sourceUrl: "http://twkan.com/chapter/504" }).success).toBe(false);
    expect(adminImportManualChapterSchema.safeParse({ ...validChapter, sourceUrl: "https://user:pass@twkan.com/chapter/504" }).success).toBe(false);
    expect(adminImportManualChapterSchema.safeParse({ ...validChapter, sourceUrl: "http://localhost:3000/chapter/504" }).success).toBe(true);
  });
});
