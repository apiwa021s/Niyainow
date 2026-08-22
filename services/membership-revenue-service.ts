import "server-only";

import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  creatorLedgerEntries,
  creatorRevenueContracts,
  creatorRevenueEvents,
  writerMembershipPlans,
} from "@/db/schema";
import { splitCreatorRevenue } from "@/lib/domain/creator-revenue";

export async function recordMembershipRevenue(input: {
  stripeInvoiceId: string;
  writerId: string;
  membershipPlanId: string;
  amountPaidMinor: number;
  currency: string;
  occurredAt: Date;
}) {
  if (!Number.isSafeInteger(input.amountPaidMinor) || input.amountPaidMinor <= 0) {
    return { recorded: false, reason: "NO_ELIGIBLE_REVENUE" as const };
  }
  if (!/^[A-Z]{3}$/u.test(input.currency)) throw new RangeError("invalid_membership_revenue_currency");
  return getDb().transaction(async (tx) => {
    const referenceId = `stripe-invoice:${input.stripeInvoiceId}`;
    const [existing] = await tx.select({ id: creatorRevenueEvents.id }).from(creatorRevenueEvents)
      .where(eq(creatorRevenueEvents.externalReference, referenceId)).limit(1);
    if (existing) return { recorded: false, reason: "DUPLICATE" as const, revenueEventId: existing.id };

    const [plan] = await tx.select({ writerId: writerMembershipPlans.writerId }).from(writerMembershipPlans)
      .where(eq(writerMembershipPlans.id, input.membershipPlanId)).limit(1);
    if (!plan || plan.writerId !== input.writerId) throw new Error("membership_revenue_plan_mismatch");
    const [contract] = await tx.select({
      id: creatorRevenueContracts.id,
      creatorShareBasisPoints: creatorRevenueContracts.creatorShareBasisPoints,
      platformShareBasisPoints: creatorRevenueContracts.platformShareBasisPoints,
      effectiveFrom: creatorRevenueContracts.effectiveFrom,
    }).from(creatorRevenueContracts).where(and(
      eq(creatorRevenueContracts.writerId, input.writerId),
      eq(creatorRevenueContracts.status, "ACTIVE"),
      lte(creatorRevenueContracts.effectiveFrom, input.occurredAt),
      or(isNull(creatorRevenueContracts.effectiveTo), gt(creatorRevenueContracts.effectiveTo, input.occurredAt)),
    )).orderBy(desc(creatorRevenueContracts.effectiveFrom)).limit(1);
    if (!contract) throw new Error("membership_revenue_contract_missing");
    const split = splitCreatorRevenue({
      eligibleRevenueMinor: input.amountPaidMinor,
      creatorShareBasisPoints: contract.creatorShareBasisPoints,
      platformShareBasisPoints: contract.platformShareBasisPoints,
    });
    const [event] = await tx.insert(creatorRevenueEvents).values({
      writerId: input.writerId,
      sourceType: "membership_subscription",
      coinAmount: 0,
      eligibleRevenueMinor: input.amountPaidMinor,
      creatorShareBasisPoints: contract.creatorShareBasisPoints,
      platformShareBasisPoints: contract.platformShareBasisPoints,
      creatorRevenueMinor: split.creatorRevenueMinor,
      platformRevenueMinor: split.platformRevenueMinor,
      currency: input.currency,
      revenueRuleVersion: `contract:${contract.id}:${contract.effectiveFrom.toISOString()}`,
      revenueContractId: contract.id,
      externalReference: referenceId,
      status: "pending",
      createdAt: input.occurredAt,
    }).returning({ id: creatorRevenueEvents.id });
    if (!event) throw new Error("membership_revenue_event_write_failed");
    if (split.creatorRevenueMinor === 0) {
      return { recorded: true, creatorRevenueMinor: 0, revenueEventId: event.id };
    }
    const [ledger] = await tx.insert(creatorLedgerEntries).values({
      writerId: input.writerId,
      revenueEventId: event.id,
      type: "membership_subscription",
      amountMinor: split.creatorRevenueMinor,
      currency: input.currency,
      status: "pending",
      referenceId,
      createdAt: input.occurredAt,
    }).returning({ id: creatorLedgerEntries.id });
    if (!ledger) throw new Error("membership_revenue_ledger_write_failed");
    return { recorded: true, ledgerEntryId: ledger.id, creatorRevenueMinor: split.creatorRevenueMinor };
  });
}

export async function reverseMembershipRevenue(input: {
  stripeInvoiceId: string;
  stripeCreditNoteId: string;
  amountRefundedMinor: number;
  currency: string;
  occurredAt: Date;
}) {
  if (!Number.isSafeInteger(input.amountRefundedMinor) || input.amountRefundedMinor <= 0) {
    return { recorded: false, reason: "NO_REFUND" as const };
  }
  return getDb().transaction(async (tx) => {
    const referenceId = `stripe-credit-note:${input.stripeCreditNoteId}`;
    const [duplicate] = await tx.select({ id: creatorRevenueEvents.id }).from(creatorRevenueEvents)
      .where(eq(creatorRevenueEvents.externalReference, referenceId)).limit(1);
    if (duplicate) return { recorded: false, reason: "DUPLICATE" as const, revenueEventId: duplicate.id };
    const [originalReference] = await tx.select({ id: creatorRevenueEvents.id }).from(creatorRevenueEvents)
      .where(eq(creatorRevenueEvents.externalReference, `stripe-invoice:${input.stripeInvoiceId}`))
      .for("update").limit(1);
    if (!originalReference) throw new Error("membership_refund_original_missing");
    const [original] = await tx.select().from(creatorRevenueEvents)
      .where(eq(creatorRevenueEvents.id, originalReference.id)).limit(1);
    if (!original || original.sourceType !== "membership_subscription") throw new Error("membership_refund_original_invalid");
    if (original.currency !== input.currency) throw new Error("membership_refund_currency_mismatch");
    const [prior] = await tx.select({
      amount: sql<number>`coalesce(sum(-${creatorRevenueEvents.eligibleRevenueMinor}), 0)::int`,
    }).from(creatorRevenueEvents).where(and(
      eq(creatorRevenueEvents.reversalOfRevenueEventId, original.id),
      eq(creatorRevenueEvents.sourceType, "refund_reversal"),
    ));
    const alreadyReversed = prior?.amount ?? 0;
    const remaining = original.eligibleRevenueMinor - alreadyReversed;
    const amountToReverse = Math.min(input.amountRefundedMinor, remaining);
    if (amountToReverse <= 0) return { recorded: false, reason: "FULLY_REVERSED" as const };
    const split = splitCreatorRevenue({
      eligibleRevenueMinor: amountToReverse,
      creatorShareBasisPoints: original.creatorShareBasisPoints,
      platformShareBasisPoints: original.platformShareBasisPoints,
    });
    const [event] = await tx.insert(creatorRevenueEvents).values({
      writerId: original.writerId,
      sourceType: "refund_reversal",
      coinAmount: 0,
      eligibleRevenueMinor: -amountToReverse,
      creatorShareBasisPoints: original.creatorShareBasisPoints,
      platformShareBasisPoints: original.platformShareBasisPoints,
      creatorRevenueMinor: -split.creatorRevenueMinor,
      platformRevenueMinor: -split.platformRevenueMinor,
      currency: original.currency,
      revenueRuleVersion: original.revenueRuleVersion,
      revenueContractId: original.revenueContractId,
      externalReference: referenceId,
      reversalOfRevenueEventId: original.id,
      status: "reversed",
      createdAt: input.occurredAt,
    }).returning({ id: creatorRevenueEvents.id });
    if (!event) throw new Error("membership_refund_event_write_failed");
    if (split.creatorRevenueMinor > 0) {
      await tx.insert(creatorLedgerEntries).values({
        writerId: original.writerId,
        revenueEventId: event.id,
        type: "refund_reversal",
        amountMinor: -split.creatorRevenueMinor,
        currency: original.currency,
        status: "reversed",
        referenceId,
        createdAt: input.occurredAt,
      });
    }
    const fullyReversed = amountToReverse === remaining;
    if (fullyReversed) {
      await tx.update(creatorRevenueEvents).set({ status: "reversed" }).where(eq(creatorRevenueEvents.id, original.id));
      await tx.update(creatorLedgerEntries).set({ status: "reversed" }).where(eq(creatorLedgerEntries.revenueEventId, original.id));
    }
    return { recorded: true, amountReversedMinor: amountToReverse, creatorRevenueReversedMinor: split.creatorRevenueMinor, fullyReversed };
  });
}