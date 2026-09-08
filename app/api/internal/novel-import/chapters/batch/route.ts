import { novelImportChapterBatchInputSchema } from "@/lib/domain/novel-import";
import { ingestNovelImportChapterBatch } from "@/services/novel-import-service";

import { handleNovelImportRoute } from "../../_shared";

export async function POST(request: Request) {
  return handleNovelImportRoute(
    request,
    {
      schema: novelImportChapterBatchInputSchema,
      maximumBytes: 10 * 1_024 * 1_024,
      scope: "internal-novel-import-chapter-batch",
      rateLimit: { limit: 120, windowMs: 60_000 },
    },
    ingestNovelImportChapterBatch,
  );
}
