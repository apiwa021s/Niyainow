import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({ assertTranslationPermission: vi.fn() }));

import { polishTranslationSynopsisSchema, reviewTranslationTitleSchema } from "@/services/translation-service";

describe("translation metadata validation", () => {
  it("accepts bounded metadata review input", () => {
    expect(reviewTranslationTitleSchema.safeParse({ title: "ชื่อเรื่อง", synopsis: "เรื่องย่อ" }).success).toBe(true);
    expect(reviewTranslationTitleSchema.safeParse({ title: "", synopsis: "เรื่องย่อ" }).success).toBe(false);
  });

  it("requires an optimistic workspace version before applying a polished synopsis", () => {
    expect(polishTranslationSynopsisSchema.safeParse({ expectedVersion: 1 }).success).toBe(true);
    expect(polishTranslationSynopsisSchema.safeParse({ expectedVersion: 0 }).success).toBe(false);
    expect(polishTranslationSynopsisSchema.safeParse({}).success).toBe(false);
  });
});
