import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { getPrivacySettings, privacyInputSchema, updatePrivacySettings } from "@/services/public-creator-service";

export async function GET(request: Request) { return handleUserRoute(request, { scope: "privacy-settings" }, getPrivacySettings); }
export async function PATCH(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "privacy-settings-write" }, async (userId) => updatePrivacySettings(userId, await parseJson(request, privacyInputSchema)));
}