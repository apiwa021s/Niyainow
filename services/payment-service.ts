import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { coinPackages } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import { hasStripeConfiguration } from "@/lib/env";
import { stripeCoinTopupProvider } from "@/services/stripe-provider";

export interface CoinTopupProvider {
  createCheckout(input: { userId: string; packageId: string; returnUrl: string; idempotencyKey: string }): Promise<{ redirectUrl: string }>;
  handleWebhook(request: Request): Promise<void>;
}

let topupProvider: CoinTopupProvider | null = null;

export function configureCoinTopupProvider(provider: CoinTopupProvider) {
  topupProvider = provider;
}

export async function createCoinTopup(userId: string, packageId: string, returnUrl: string, idempotencyKey: string) {
  const provider = topupProvider ?? (hasStripeConfiguration() ? stripeCoinTopupProvider : null);
  if (!provider) throw new ApiError(503, "COIN_TOPUP_PROVIDER_NOT_CONFIGURED", "ระบบเติม Coins ยังไม่เปิดใช้งาน");
  const [coinPackage] = await getDb().select({ id: coinPackages.id }).from(coinPackages)
    .where(and(eq(coinPackages.id, packageId), eq(coinPackages.isActive, true))).limit(1);
  if (!coinPackage) throw new ApiError(404, "COIN_PACKAGE_NOT_FOUND", "ไม่พบแพ็กเกจ Coins นี้");
  return provider.createCheckout({ userId, packageId, returnUrl, idempotencyKey });
}