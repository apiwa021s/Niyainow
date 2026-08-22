import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { readerMemberships, writerMembershipPlans, writerProfiles } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";

import { requireWriterProfileForUser } from "./studio-service";

export interface MembershipBillingProvider {
  subscribe(input: { readerId: string; planId: string; returnUrl: string }): Promise<{ redirectUrl: string }>;
  cancel(input: { providerSubscriptionId: string; atPeriodEnd: boolean }): Promise<void>;
  getStatus(providerSubscriptionId: string): Promise<string>;
  handleWebhook(request: Request): Promise<void>;
}

let billingProvider: MembershipBillingProvider | null = null;

export function configureMembershipBillingProvider(provider: MembershipBillingProvider) {
  billingProvider = provider;
}

export const membershipPlanInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional().nullable(),
  priceMinor: z.number().int().positive().max(100_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/u).default("THB"),
  earlyAccessChapterCount: z.number().int().min(0).max(100),
  active: z.boolean().default(false),
}).strict();

export async function getWriterMembershipPlanForUser(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const [plan] = await getDb().select().from(writerMembershipPlans)
    .where(eq(writerMembershipPlans.writerId, writer.id))
    .orderBy(desc(writerMembershipPlans.updatedAt)).limit(1);
  return plan ?? null;
}

export async function saveWriterMembershipPlan(userId: string, input: z.infer<typeof membershipPlanInputSchema>) {
  const writer = await requireWriterProfileForUser(userId);
  return getDb().transaction(async (tx) => {
    const [existing] = await tx.select({ id: writerMembershipPlans.id }).from(writerMembershipPlans)
      .where(eq(writerMembershipPlans.writerId, writer.id)).orderBy(desc(writerMembershipPlans.updatedAt)).limit(1);
    if (input.active) {
      await tx.update(writerMembershipPlans).set({ status: "INACTIVE", updatedAt: new Date() })
        .where(and(eq(writerMembershipPlans.writerId, writer.id), eq(writerMembershipPlans.status, "ACTIVE")));
    }
    if (existing) {
      const [plan] = await tx.update(writerMembershipPlans).set({
        name: input.name,
        description: input.description,
        priceMinor: input.priceMinor,
        currency: input.currency,
        earlyAccessChapterCount: input.earlyAccessChapterCount,
        status: input.active ? "ACTIVE" : "DRAFT",
        updatedAt: new Date(),
      }).where(eq(writerMembershipPlans.id, existing.id)).returning();
      return plan;
    }
    const [plan] = await tx.insert(writerMembershipPlans).values({
      writerId: writer.id,
      name: input.name,
      description: input.description,
      priceMinor: input.priceMinor,
      currency: input.currency,
      earlyAccessChapterCount: input.earlyAccessChapterCount,
      status: input.active ? "ACTIVE" : "DRAFT",
    }).returning();
    return plan;
  });
}

export async function getPublicWriterMembershipPlan(writerId: string) {
  const [plan] = await getDb().select({
    id: writerMembershipPlans.id,
    writerId: writerMembershipPlans.writerId,
    name: writerMembershipPlans.name,
    description: writerMembershipPlans.description,
    priceMinor: writerMembershipPlans.priceMinor,
    currency: writerMembershipPlans.currency,
    earlyAccessChapterCount: writerMembershipPlans.earlyAccessChapterCount,
  }).from(writerMembershipPlans).innerJoin(writerProfiles, eq(writerProfiles.id, writerMembershipPlans.writerId))
    .where(and(eq(writerMembershipPlans.writerId, writerId), eq(writerMembershipPlans.status, "ACTIVE"), eq(writerProfiles.status, "ACTIVE"))).limit(1);
  return plan ?? null;
}

export async function listReaderMemberships(readerId: string) {
  return getDb().select({
    id: readerMemberships.id,
    writerId: readerMemberships.writerId,
    writerUsername: writerProfiles.username,
    writerDisplayName: writerProfiles.displayName,
    planId: readerMemberships.membershipPlanId,
    status: readerMemberships.status,
    currentPeriodStart: readerMemberships.currentPeriodStart,
    currentPeriodEnd: readerMemberships.currentPeriodEnd,
    cancelAtPeriodEnd: readerMemberships.cancelAtPeriodEnd,
  }).from(readerMemberships).innerJoin(writerProfiles, eq(writerProfiles.id, readerMemberships.writerId))
    .where(eq(readerMemberships.readerId, readerId)).orderBy(desc(readerMemberships.updatedAt));
}

export async function subscribeToWriterMembership(readerId: string, planId: string, returnUrl: string) {
  if (!billingProvider) throw new ApiError(503, "MEMBERSHIP_BILLING_NOT_CONFIGURED", "ระบบสมัคร Membership ยังไม่เปิดใช้งาน");
  const [plan] = await getDb().select({ id: writerMembershipPlans.id }).from(writerMembershipPlans)
    .where(and(eq(writerMembershipPlans.id, planId), eq(writerMembershipPlans.status, "ACTIVE"))).limit(1);
  if (!plan) throw new ApiError(404, "MEMBERSHIP_PLAN_NOT_FOUND", "ไม่พบ Membership plan นี้");
  return billingProvider.subscribe({ readerId, planId, returnUrl });
}

export async function cancelReaderMembership(readerId: string, membershipId: string) {
  if (!billingProvider) throw new ApiError(503, "MEMBERSHIP_BILLING_NOT_CONFIGURED", "ระบบยกเลิก Membership ยังไม่เปิดใช้งาน");
  const [membership] = await getDb().select().from(readerMemberships)
    .where(and(eq(readerMemberships.id, membershipId), eq(readerMemberships.readerId, readerId))).limit(1);
  if (!membership) throw new ApiError(404, "MEMBERSHIP_NOT_FOUND", "ไม่พบ Membership นี้");
  if (!membership.providerSubscriptionId) throw new ApiError(409, "MEMBERSHIP_PROVIDER_REFERENCE_MISSING", "Membership นี้ไม่มีข้อมูลผู้ให้บริการชำระเงิน");
  await billingProvider.cancel({ providerSubscriptionId: membership.providerSubscriptionId, atPeriodEnd: true });
  const [updated] = await getDb().update(readerMemberships).set({
    status: "cancel_at_period_end",
    cancelAtPeriodEnd: true,
    updatedAt: new Date(),
  }).where(eq(readerMemberships.id, membership.id)).returning();
  return updated;
}