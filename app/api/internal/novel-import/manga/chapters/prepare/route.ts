import { novelImportMangaChapterPrepareInputSchema } from "@/lib/domain/novel-import";
import { prepareNovelImportMangaChapter } from "@/services/novel-import-service";

import { handleNovelImportRoute } from "../../../_shared";

export async function POST(request: Request) {
  return handleNovelImportRoute(
    request,
    {
      schema: novelImportMangaChapterPrepareInputSchema,
      maximumBytes: 512 * 1_024,
      scope: "internal-novel-import-manga-prepare",
      rateLimit: { limit: 120, windowMs: 60_000 },
    },
    prepareNovelImportMangaChapter,
  );
}
