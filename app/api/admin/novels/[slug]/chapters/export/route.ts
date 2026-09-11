import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { buildChapterTextArchive } from "@/lib/admin/chapter-text-export";
import {
  adminChapterTextExportSelectionSchema,
  getAdminChapterTextExport,
  getAdminNovel,
} from "@/services/admin-service";

type Context = { params: Promise<{ slug: string }> };

function contentDisposition(asciiFilename: string, unicodeFilename: string) {
  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(unicodeFilename)}`;
}

async function chapterExportResponse(slug: string, chapterIds?: string[]) {
  const [novel, chapters] = await Promise.all([
    getAdminNovel(slug),
    getAdminChapterTextExport(slug, chapterIds),
  ]);
  if (!novel) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "ไม่พบนิยายที่ต้องการดาวน์โหลด" } },
      { status: 404 },
    );
  }
  if (!chapters.length) {
    return Response.json(
      { error: { code: "NO_CHAPTERS", message: "นิยายเรื่องนี้ยังไม่มีตอนให้ดาวน์โหลด" } },
      { status: 404 },
    );
  }

  const selected = Boolean(chapterIds);
  const archive = buildChapterTextArchive(chapters);
  return new Response(Uint8Array.from(archive), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": contentDisposition(
        `${novel.slug}-${selected ? "selected-" : ""}chapters.zip`,
        `${novel.title}-${selected ? "ตอนที่เลือก" : "ตอนทั้งหมด"}.zip`,
      ),
      "Content-Type": "application/zip",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    return await chapterExportResponse(slug);
  } catch (error) {
    return adminApiError(error, request);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, adminChapterTextExportSelectionSchema);
    const { slug } = await context.params;
    return await chapterExportResponse(slug, input.chapterIds);
  } catch (error) {
    return adminApiError(error, request);
  }
}
