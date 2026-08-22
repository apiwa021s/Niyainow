import { handleUserRoute } from "@/app/api/me/_shared";
import { listReaderMemberships } from "@/services/membership-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "reader-memberships" }, listReaderMemberships);
}