import { handleUserRoute } from "@/app/api/me/_shared";
import { cancelReaderMembership } from "@/services/membership-service";

type Context = { params: Promise<{ membershipId: string }> };

export async function POST(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "membership-cancel", rateLimit: { limit: 5, windowMs: 60_000 } }, async (userId) => {
    const { membershipId } = await context.params;
    return cancelReaderMembership(userId, membershipId);
  });
}