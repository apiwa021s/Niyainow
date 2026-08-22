import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { creatorRevenueContracts, writerProfiles } from "@/db/schema";
import { assertAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/http/api-response";

export const revenueContractInputSchema = z.object({
  writerId: z.string().uuid(),
  type: z.enum(["standard", "founding_author", "exclusive", "custom"]),
  creatorShareBasisPoints: z.number().int().min(0).max(10_000),
  platformShareBasisPoints: z.number().int().min(0).max(10_000),
  effectiveFrom: z.iso.datetime({ offset: true }),
  effectiveTo: z.iso.datetime({ offset: true }).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
}).strict().superRefine((input, context) => {
  if (input.creatorShareBasisPoints + input.platformShareBasisPoints !== 10_000) context.addIssue({ code: "custom", path: ["creatorShareBasisPoints"], message: "Revenue shares must total 10000 basis points" });
  if (input.effectiveTo && new Date(input.effectiveFrom) >= new Date(input.effectiveTo)) context.addIssue({ code: "custom", path: ["effectiveTo"], message: "Invalid contract window" });
});

export async function createRevenueContract(input: z.infer<typeof revenueContractInputSchema>) {
  await assertAdmin();
  const [writer] = await getDb().select({ id: writerProfiles.id }).from(writerProfiles).where(eq(writerProfiles.id, input.writerId)).limit(1);
  if (!writer) throw new ApiError(404, "WRITER_NOT_FOUND", "ไม่พบนักเขียนนี้");
  const from = new Date(input.effectiveFrom);
  const to = input.effectiveTo ? new Date(input.effectiveTo) : null;
  const [overlap] = await getDb().select({ id: creatorRevenueContracts.id }).from(creatorRevenueContracts).where(and(
    eq(creatorRevenueContracts.writerId, input.writerId),
    eq(creatorRevenueContracts.status, "ACTIVE"),
    sql`(${creatorRevenueContracts.effectiveTo} is null or ${creatorRevenueContracts.effectiveTo} > ${from})`,
    ...(to ? [sql`${creatorRevenueContracts.effectiveFrom} < ${to}`] : []),
  )).orderBy(desc(creatorRevenueContracts.effectiveFrom)).limit(1);
  if (input.status === "ACTIVE" && overlap) throw new ApiError(409, "REVENUE_CONTRACT_OVERLAP", "นักเขียนมีสัญญาที่ใช้งานอยู่แล้ว");
  const [contract] = await getDb().insert(creatorRevenueContracts).values({
    writerId: input.writerId,
    type: input.type,
    creatorShareBasisPoints: input.creatorShareBasisPoints,
    platformShareBasisPoints: input.platformShareBasisPoints,
    effectiveFrom: from,
    effectiveTo: to,
    status: input.status,
  }).returning();
  return contract;
}