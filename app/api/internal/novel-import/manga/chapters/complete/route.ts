import { novelImportMangaChapterCompleteInputSchema } from "@/lib/domain/novel-import";
import { completeNovelImportMangaChapter } from "@/services/novel-import-service";

import { handleNovelImportRoute } from "../../../_shared";

export async function POST(request: Request) {
  return handleNovelImportRoute(
    request,
    {
      schema: novelImportMangaChapterCompleteInputSchema,
      maximumBytes: 256 * 1_024,
      scope: "internal-novel-import-manga-complete",
      rateLimit: { limit: 120, windowMs: 60_000 },
    },
    completeNovelImportMangaChapter,
  );
}
