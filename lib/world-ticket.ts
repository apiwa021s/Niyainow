import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { worldCharacterAppearanceSchema } from "@/world/types";

const ticketPayloadSchema = z.object({
  version: z.literal(1),
  playerId: z.string().uuid(),
  displayName: z.string().min(2).max(24),
  title: z.string().max(48).optional(),
  appearance: worldCharacterAppearanceSchema,
  worldId: z.string().min(1).max(64),
  x: z.number().finite(),
  y: z.number().finite(),
  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
});

export type WorldTicketPayload = z.infer<typeof ticketPayloadSchema>;

function secret(source: NodeJS.ProcessEnv = process.env) {
  const value = source.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be configured to issue world tickets");
  return value;
}

function sign(encodedPayload: string, source?: NodeJS.ProcessEnv) {
  return createHmac("sha256", secret(source)).update(encodedPayload).digest("base64url");
}

export function issueWorldTicket(
  payload: Omit<WorldTicketPayload, "version" | "issuedAt" | "expiresAt">,
  source?: NodeJS.ProcessEnv,
) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const complete = ticketPayloadSchema.parse({ ...payload, version: 1, issuedAt, expiresAt: issuedAt + 5 * 60 });
  const encoded = Buffer.from(JSON.stringify(complete), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, source)}`;
}

export function verifyWorldTicket(token: string, source?: NodeJS.ProcessEnv): WorldTicketPayload {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) throw new Error("Invalid world ticket");
  const expectedSignature = sign(encoded, source);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Invalid world ticket");
  const parsed = ticketPayloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
  if (parsed.expiresAt < Math.floor(Date.now() / 1000)) throw new Error("Expired world ticket");
  return parsed;
}
