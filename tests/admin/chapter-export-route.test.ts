import { strFromU8, unzipSync } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminChapterTextExport: vi.fn(),
  getAdminNovel: vi.fn(),
  parseAdminMutation: vi.fn(),
}));

vi.mock("@/app/api/admin/_shared", () => ({
  adminApiError: vi.fn(() => Response.json({ error: { message: "error" } }, { status: 500 })),
  parseAdminMutation: mocks.parseAdminMutation,
}));
vi.mock("@/services/admin-service", () => ({
  adminChapterTextExportSelectionSchema: {},
  getAdminChapterTextExport: mocks.getAdminChapterTextExport,
  getAdminNovel: mocks.getAdminNovel,
}));

import { POST } from "@/app/api/admin/novels/[slug]/chapters/export/route";

describe("selected chapter text export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a zip containing only the selected chapters", async () => {
    const chapterId = "00000000-0000-4000-8000-000000000002";
    mocks.parseAdminMutation.mockResolvedValue({ chapterIds: [chapterId] });
    mocks.getAdminNovel.mockResolvedValue({ slug: "stable-story", title: "เรื่องทดสอบ" });
    mocks.getAdminChapterTextExport.mockResolvedValue([
      { chapterNumber: 2, title: "การเดินทาง", content: "เนื้อหาที่เลือก" },
    ]);

    const request = new Request("https://example.com/api/admin/novels/stable-story/chapters/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chapterIds: [chapterId] }),
    });
    const response = await POST(request, { params: Promise.resolve({ slug: "stable-story" }) });

    expect(mocks.getAdminChapterTextExport).toHaveBeenCalledWith("stable-story", [chapterId]);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain("stable-story-selected-chapters.zip");
    const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
    expect(Object.keys(files)).toEqual(["002-การเดินทาง.txt"]);
    expect(strFromU8(files["002-การเดินทาง.txt"])).toBe("เนื้อหาที่เลือก");
  });
});
