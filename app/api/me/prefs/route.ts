import { z } from "zod";

import { parseJson } from "@/lib/http/api-response";
import { getReaderPrefs, saveReaderPrefs } from "@/services/reader-prefs-service";

import { handleUserRoute } from "../_shared";

/**
 * Mirrors ReaderPrefs in stores/use-reader-store.ts. Kept permissive on the
 * numeric bounds the client already clamps, strict on the enums, so a payload
 * from an older tab is stored rather than rejected outright.
 */
const prefsSchema = z.object({
  theme: z.enum(["light", "sepia", "dark", "amoled"]),
  font: z.enum(["looped", "loopless", "serif"]),
  fontSizeIndex: z.number().int().min(0).max(7),
  lineHeight: z.enum(["tight", "normal", "airy"]),
  width: z.enum(["narrow", "normal", "wide"]),
  paragraphStyle: z.enum(["gap", "indent"]),
  dim: z.number().min(0).max(0.35),
  keepScreenAwake: z.boolean(),
});

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "me-prefs-read" }, (userId) => getReaderPrefs(userId));
}

export async function PUT(request: Request) {
  return handleUserRoute(
    request,
    // The client debounces to 2s; this ceiling only catches a runaway tab.
    { mutation: true, scope: "me-prefs-write", rateLimit: { limit: 60, windowMs: 10 * 60_000 } },
    async (userId) => {
      const prefs = await parseJson(request, prefsSchema);
      return saveReaderPrefs(userId, prefs);
    },
  );
}
