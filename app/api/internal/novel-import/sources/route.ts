import { novelImportSourceInputSchema } from "@/lib/domain/novel-import";
import { registerNovelImportSource } from "@/services/novel-import-service";

import { handleNovelImportRoute } from "../_shared";

export async function POST(request: Request) {
  return handleNovelImportRoute(
    request,
    {
      schema: novelImportSourceInputSchema,
      maximumBytes: 128 * 1_024,
      scope: "internal-novel-import-source",
      rateLimit: { limit: 60, windowMs: 60_000 },
    },
    registerNovelImportSource,
  );
}
