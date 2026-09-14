import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import {
  claimReaderMission,
  getReaderMissionDashboard,
} from "@/services/reader-mission-service";

const claimMissionSchema = z.object({
  missionId: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
});

export async function GET(request: Request) {
  return handleUserRoute(
    request,
    { scope: "me-reader-missions-read" },
    getReaderMissionDashboard,
  );
}

export async function POST(request: Request) {
  return handleUserRoute(
    request,
    {
      mutation: true,
      scope: "me-reader-missions-claim",
      rateLimit: { limit: 20, windowMs: 60_000 },
    },
    async (userId) => {
      const input = await parseJson(request, claimMissionSchema);
      return claimReaderMission(userId, input.missionId);
    },
  );
}
