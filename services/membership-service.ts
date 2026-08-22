import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { membershipBenefits, readerMemberships, writerMembershipPlanBenefits, writerMembershipPlans, writerProfiles } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import { hasStripeConfiguration } from "@/lib/env";
import { stripeMembershipBillingProvider } from "@/services/stripe-provider";

import { requireWriterProfileForUser } from "./studio-service";

export interface MembershipBillingProvider {
  subscribe(input: { readerId: string; planId: string; returnUrl: string; idempotencyKey: string }): Promise<{ redirectUrl: string }>;
  cancel(input: { providerSubscriptionId: string; atPeriodEnd: boolean }): Promise<void>;
  getStatus(providerSubscriptionId: string): Promise<string>;
  handleWebhook(request: Request): Promise<void>;
}

let billingProvider: MembershipBillingProvider | null = null;

export function configureMembershipBillingProvider(provider: MembershipBillingProvider) {
  billingProvider = provider;
}

export const membershipProviderEventSchema = z.object({
  provider: z.string().trim().min(1).max(80),
  providerSubscriptionId: z.string().trim().min(1).max(255),
  readerId: z.string().uuid(),
  writerId: z.string().uuid(),
  membershipPlanId: z.string().uuid(),
  status: z.enum(["active", "cancel_at_period_end", "expired", "past_due", "cancelled"]),
  currentPeriodStart: z.coerce.date(),
  currentPeriodEnd: z.coerce.date(),
  cancelAtPeriodEnd: z.boolean(),
}).strict().superRefine((input, context) => {
  if (input.currentPeriodStart >= input.currentPeriodEnd) context.addIssue({ code: "custom", path: ["currentPeriodEnd"], message: "Invalid membership period" });
});

/** Trusted webhook primitive. The provider adapter must verify the webhook signature first. */
export async function applyMembershipProviderEvent(input: z.infer<typeof membershipProviderEventSchema>) {
  const [plan] = await getDb().select({ writerId: writerMembershipPlans.writerId }).from(writerMembershipPlans)
    .where(eq(writerMembershipPlans.id, input.membershipPlanId)).limit(1);
  if (!plan || plan.writerId !== input.writerId) throw new ApiError(400, "MEMBERSHIP_PLAN_MISMATCH", "Membership plan ไม่ตรงกับนักเขียน");
  const [membership] = await getDb().insert(readerMemberships).values(input).onConflictDoUpdate({
    target: [readerMemberships.provider, readerMemberships.providerSubscriptionId],
    set: {
      readerId: input.readerId,
      writerId: input.writerId,
      membershipPlanId: input.membershipPlanId,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      updatedAt: new Date(),
    },
  }).returning();
  if (!membership) throw new Error("membership_provider_event_write_failed");
  return membership;
}

export const membershipPlanInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional().nullable(),
  priceMinor: z.number().int().positive().max(100_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/u).default("THB"),
  earlyAccessChapterCount: z.number().int().min(0).max(100),
  benefitIds: z.array(z.string().uuid()).max(4).default([]),
  active: z.boolean().default(false),
}).strict();

export async function getWriterMembershipPlanForUser(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const [plan] = await getDb().select().from(writerMembershipPlans)
    .where(eq(writerMembershipPlans.writerId, writer.id))
    .orderBy(desc(writerMembershipPlans.updatedAt)).limit(1);
  if (!plan) return null;
  const benefits = await getDb().select({
    id: membershipBenefits.id,
    slug: membershipBenefits.slug,
    nameTh: membershipBenefits.nameTh,
    nameEn: membershipBenefits.nameEn,
  }).from(writerMembershipPlanBenefits)
    .innerJoin(membershipBenefits, eq(membershipBenefits.id, writerMembershipPlanBenefits.benefitId))
    .where(eq(writerMembershipPlanBenefits.membershipPlanId, plan.id));
  return { ...plan, benefits };
}

export async function saveWriterMembershipPlan(userId: string, input: z.infer<typeof membershipPlanInputSchema>) {
  const writer = await requireWriterProfileForUser(userId);
  return getDb().transaction(async (tx) => {
    const uniqueBenefitIds = [...new Set(input.benefitIds)];
    const benefitRows = uniqueBenefitIds.length
      ? await tx.select({ id: membershipBenefits.id }).from(membershipBenefits)
          .where(and(inArray(membershipBenefits.id, uniqueBenefitIds), eq(membershipBenefits.isActive, true)))
      : [];
    if (benefitRows.length !== uniqueBenefitIds.length) throw new ApiError(400, "INVALID_MEMBERSHIP_BENEFITS", "มีสิทธิประโยชน์ที่ไม่ถูกต้องหรือปิดใช้งานแล้ว");
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
      if (!plan) throw new Error("membership_plan_update_failed");
      await tx.delete(writerMembershipPlanBenefits).where(eq(writerMembershipPlanBenefits.membershipPlanId, plan.id));
      if (benefitRows.length) await tx.insert(writerMembershipPlanBenefits).values(benefitRows.map((benefit) => ({ membershipPlanId: plan.id, benefitId: benefit.id })));
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
    if (!plan) throw new Error("membership_plan_write_failed");
    if (benefitRows.length) await tx.insert(writerMembershipPlanBenefits).values(benefitRows.map((benefit) => ({ membershipPlanId: plan.id, benefitId: benefit.id })));
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
  if (!plan) return null;
  const benefits = await getDb().select({
    id: membershipBenefits.id,
    slug: membershipBenefits.slug,
    nameTh: membershipBenefits.nameTh,
    nameEn: membershipBenefits.nameEn,
  }).from(writerMembershipPlanBenefits)
    .innerJoin(membershipBenefits, eq(membershipBenefits.id, writerMembershipPlanBenefits.benefitId))
    .where(eq(writerMembershipPlanBenefits.membershipPlanId, plan.id));
  return { ...plan, benefits };
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

export async function subscribeToWriterMembership(readerId: string, writerId: string, planId: string, returnUrl: string, idempotencyKey: string) {
  const provider = billingProvider ?? (hasStripeConfiguration() ? stripeMembershipBillingProvider : null);
  if (!provider) throw new ApiError(503, "MEMBERSHIP_BILLING_NOT_CONFIGURED", "ระบบสมัคร Membership ยังไม่เปิดใช้งาน");
  const [plan] = await getDb().select({ id: writerMembershipPlans.id }).from(writerMembershipPlans)
    .where(and(eq(writerMembershipPlans.id, planId), eq(writerMembershipPlans.status, "ACTIVE"))).limit(1);
  if (!plan) throw new ApiError(404, "MEMBERSHIP_PLAN_NOT_FOUND", "ไม่พบ Membership plan นี้");
  const [ownedPlan] = await getDb().select({ id: writerMembershipPlans.id }).from(writerMembershipPlans)
    .where(and(eq(writerMembershipPlans.id, planId), eq(writerMembershipPlans.writerId, writerId))).limit(1);
  if (!ownedPlan) throw new ApiError(404, "MEMBERSHIP_PLAN_NOT_FOUND", "ไม่พบ Membership plan ของนักเขียนนี้");
  const now = new Date();
  const [existing] = await getDb().select({ id: readerMemberships.id }).from(readerMemberships).where(and(
    eq(readerMemberships.readerId, readerId),
    eq(readerMemberships.writerId, writerId),
    inArray(readerMemberships.status, ["active", "cancel_at_period_end"]),
    sql`${readerMemberships.currentPeriodEnd} > ${now}`,
  )).limit(1);
  if (existing) throw new ApiError(409, "MEMBERSHIP_ALREADY_ACTIVE", "คุณเป็นสมาชิกของนักเขียนนี้อยู่แล้ว");
  return provider.subscribe({ readerId, planId, returnUrl, idempotencyKey });
}

export async function cancelReaderMembership(readerId: string, membershipId: string) {
  const provider = billingProvider ?? (hasStripeConfiguration() ? stripeMembershipBillingProvider : null);
  if (!provider) throw new ApiError(503, "MEMBERSHIP_BILLING_NOT_CONFIGURED", "ระบบยกเลิก Membership ยังไม่เปิดใช้งาน");
  const [membership] = await getDb().select().from(readerMemberships)
    .where(and(eq(readerMemberships.id, membershipId), eq(readerMemberships.readerId, readerId))).limit(1);
  if (!membership) throw new ApiError(404, "MEMBERSHIP_NOT_FOUND", "ไม่พบ Membership นี้");
  if (!membership.providerSubscriptionId) throw new ApiError(409, "MEMBERSHIP_PROVIDER_REFERENCE_MISSING", "Membership นี้ไม่มีข้อมูลผู้ให้บริการชำระเงิน");
  await provider.cancel({ providerSubscriptionId: membership.providerSubscriptionId, atPeriodEnd: true });
  const [updated] = await getDb().update(readerMemberships).set({
    status: "cancel_at_period_end",
    cancelAtPeriodEnd: true,
    updatedAt: new Date(),
  }).where(eq(readerMemberships.id, membership.id)).returning();
  return updated;
}

export async function getWriterMembershipEditorData(userId: string) {
  const [plan, availableBenefits] = await Promise.all([
    getWriterMembershipPlanForUser(userId),
    getDb().select({ id: membershipBenefits.id, slug: membershipBenefits.slug, nameTh: membershipBenefits.nameTh, nameEn: membershipBenefits.nameEn })
      .from(membershipBenefits).where(eq(membershipBenefits.isActive, true)).orderBy(membershipBenefits.sortOrder),
  ]);
  return { plan, availableBenefits };
}