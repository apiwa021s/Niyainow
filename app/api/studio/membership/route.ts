import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { getWriterMembershipPlanForUser, membershipPlanInputSchema, saveWriterMembershipPlan } from "@/services/membership-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "studio-membership" }, getWriterMembershipPlanForUser);
}

export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "studio-membership-write", rateLimit: { limit: 10, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, membershipPlanInputSchema);
    return saveWriterMembershipPlan(userId, input);
  });
}

export const PATCH = POST;