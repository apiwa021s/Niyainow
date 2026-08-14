import { createHash, randomBytes } from "node:crypto";

const PROCESS_PEPPER = randomBytes(32).toString("hex");
const DEFAULT_MAX_ENTRIES = 50_000;
const ENTRY_TTL_MS = 26 * 60 * 60 * 1_000;

export type PublicViewIdentity = {
  fingerprint: string;
  slug: string;
  chapterNumber?: number;
  now?: Date;
};

export type PublicViewReservation = {
  accepted: boolean;
  uniqueNovelReader: boolean;
  eventKey?: string;
  novelKey?: string;
  expiresAt?: number;
};

/** Date key used by the Bangkok-facing daily aggregate (Thailand has no DST). */
export function bangkokDateKey(value: Date) {
  const shifted = new Date(value.getTime() + 7 * 60 * 60 * 1_000);
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Produces a non-reversible, process-only viewer key. Raw network identifiers
 * are neither persisted nor returned to callers.
 */
export function hashPublicViewer(input: {
  address: string;
  userAgent: string;
  clientToken?: string;
  pepper?: string;
}) {
  return createHash("sha256")
    .update((input.pepper ?? process.env.AUTH_SECRET) || PROCESS_PEPPER)
    .update("\0")
    .update(input.address)
    .update("\0")
    .update(input.userAgent)
    .update("\0")
    .update(input.clientToken ?? "")
    .digest("hex");
}

function trimExpired(map: Map<string, number>, now: number, maximum: number) {
  for (const [key, expiresAt] of map) {
    if (expiresAt <= now) map.delete(key);
  }
  while (map.size >= maximum) {
    const oldest = map.keys().next().value as string | undefined;
    if (!oldest) break;
    map.delete(oldest);
  }
}

/** Bounded, process-local duplicate suppression; correctness never relies on it. */
export class PublicViewDedupe {
  private readonly events = new Map<string, number>();
  private readonly novelReaders = new Map<string, number>();
  private operations = 0;

  constructor(private readonly maximumEntries = DEFAULT_MAX_ENTRIES) {}

  reserve(input: PublicViewIdentity): PublicViewReservation {
    const now = input.now ?? new Date();
    const nowMs = now.getTime();
    this.operations += 1;
    if (
      this.operations % 128 === 0 ||
      this.events.size >= this.maximumEntries ||
      this.novelReaders.size >= this.maximumEntries
    ) {
      trimExpired(this.events, nowMs, this.maximumEntries);
      trimExpired(this.novelReaders, nowMs, this.maximumEntries);
    }

    const day = bangkokDateKey(now);
    const resource = input.chapterNumber === undefined ? "novel" : `chapter:${input.chapterNumber}`;
    const eventKey = `${day}:${input.fingerprint}:${input.slug}:${resource}`;
    const existing = this.events.get(eventKey);
    if (existing && existing > nowMs) return { accepted: false, uniqueNovelReader: false };

    const novelKey = `${day}:${input.fingerprint}:${input.slug}`;
    const novelExpiry = this.novelReaders.get(novelKey);
    const uniqueNovelReader = !novelExpiry || novelExpiry <= nowMs;
    const expiresAt = nowMs + ENTRY_TTL_MS;
    this.events.set(eventKey, expiresAt);
    if (uniqueNovelReader) this.novelReaders.set(novelKey, expiresAt);

    return { accepted: true, uniqueNovelReader, eventKey, novelKey, expiresAt };
  }

  rollback(reservation: PublicViewReservation) {
    if (!reservation.accepted || !reservation.eventKey || !reservation.expiresAt) return;
    if (this.events.get(reservation.eventKey) === reservation.expiresAt) {
      this.events.delete(reservation.eventKey);
    }
    if (
      reservation.uniqueNovelReader &&
      reservation.novelKey &&
      this.novelReaders.get(reservation.novelKey) === reservation.expiresAt
    ) {
      this.novelReaders.delete(reservation.novelKey);
    }
  }
}

export const publicViewDedupe = new PublicViewDedupe();
