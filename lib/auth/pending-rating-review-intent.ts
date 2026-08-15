export const PENDING_RATING_REVIEW_INTENT_KEY = "niyaithai-pending-rating-review-v1";
export const PENDING_RATING_REVIEW_INTENT_TTL_MS = 20 * 60 * 1_000;
export const PENDING_RATING_REVIEW_INTENT_MAX_LENGTH = 12_000;

const MAX_SLUG_LENGTH = 180;
const MAX_REVIEW_TITLE_LENGTH = 200;
const MAX_REVIEW_BODY_LENGTH = 5_000;
const MAX_FUTURE_CLOCK_SKEW_MS = 60_000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PendingRatingReviewAction = "draft" | "rating" | "review" | "delete-review";

export type PendingRatingReviewIntent = {
  version: 1;
  slug: string;
  action: PendingRatingReviewAction;
  createdAt: number;
  draft: {
    title: string;
    body: string;
    isSpoiler: boolean;
  };
  score?: number;
};

type IntentInput = {
  slug: string;
  action: PendingRatingReviewAction;
  title: string;
  body: string;
  isSpoiler: boolean;
  score?: number;
  createdAt?: number;
};

export type PendingIntentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidSlug(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= MAX_SLUG_LENGTH
    && SLUG_PATTERN.test(value);
}

function isValidDraft(value: unknown): value is PendingRatingReviewIntent["draft"] {
  if (!isRecord(value)) return false;
  return typeof value.title === "string"
    && value.title.length <= MAX_REVIEW_TITLE_LENGTH
    && typeof value.body === "string"
    && value.body.length <= MAX_REVIEW_BODY_LENGTH
    && typeof value.isSpoiler === "boolean";
}

function isValidReviewSubmission(draft: PendingRatingReviewIntent["draft"]) {
  const bodyLength = draft.body.trim().length;
  return bodyLength >= 20 && bodyLength <= MAX_REVIEW_BODY_LENGTH;
}

/**
 * Builds the only shape that may be persisted before authentication. Keeping
 * this validation client-side avoids placing a review draft in a URL while the
 * API remains the final authority after sign-in.
 */
export function createPendingRatingReviewIntent(input: IntentInput): PendingRatingReviewIntent | null {
  const createdAt = input.createdAt ?? Date.now();
  const draft = { title: input.title, body: input.body, isSpoiler: input.isSpoiler };
  if (!isValidSlug(input.slug) || !Number.isSafeInteger(createdAt) || createdAt <= 0 || !isValidDraft(draft)) {
    return null;
  }
  if (input.action === "rating" && (typeof input.score !== "number" || !Number.isInteger(input.score) || input.score < 1 || input.score > 5)) {
    return null;
  }
  if (input.action === "review" && !isValidReviewSubmission(draft)) {
    return null;
  }

  return {
    version: 1,
    slug: input.slug,
    action: input.action,
    createdAt,
    draft,
    ...(input.action === "rating" ? { score: input.score } : {}),
  };
}

/** Parses untrusted Web Storage data and returns a normalized, bounded value. */
export function parsePendingRatingReviewIntent(
  raw: string,
  now = Date.now(),
): PendingRatingReviewIntent | null {
  if (!Number.isFinite(now) || raw.length === 0 || raw.length > PENDING_RATING_REVIEW_INTENT_MAX_LENGTH) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !isValidSlug(value.slug)) return null;
    if (value.action !== "draft" && value.action !== "rating" && value.action !== "review" && value.action !== "delete-review") return null;
    if (typeof value.createdAt !== "number" || !Number.isSafeInteger(value.createdAt)) return null;
    if (value.createdAt > now + MAX_FUTURE_CLOCK_SKEW_MS) return null;
    if (now - value.createdAt > PENDING_RATING_REVIEW_INTENT_TTL_MS) return null;
    if (!isValidDraft(value.draft)) return null;
    let score: number | undefined;
    if (value.action === "rating") {
      if (typeof value.score !== "number" || !Number.isInteger(value.score) || value.score < 1 || value.score > 5) return null;
      score = value.score;
    }
    if (value.action === "review" && !isValidReviewSubmission(value.draft)) return null;

    return {
      version: 1,
      slug: value.slug,
      action: value.action,
      createdAt: value.createdAt,
      draft: {
        title: value.draft.title,
        body: value.draft.body,
        isSpoiler: value.draft.isSpoiler,
      },
      ...(score !== undefined ? { score } : {}),
    };
  } catch {
    return null;
  }
}

export function serializePendingRatingReviewIntent(intent: PendingRatingReviewIntent): string | null {
  const serialized = JSON.stringify(intent);
  return serialized.length <= PENDING_RATING_REVIEW_INTENT_MAX_LENGTH ? serialized : null;
}

export function storePendingRatingReviewIntent(
  storage: PendingIntentStorage,
  intent: PendingRatingReviewIntent,
) {
  const serialized = serializePendingRatingReviewIntent(intent);
  if (!serialized) return false;
  try {
    storage.setItem(PENDING_RATING_REVIEW_INTENT_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a matching intent. In consume mode the value must be removed before it
 * is returned, so Strict Mode remounts and duplicate components cannot replay
 * the same explicit action twice.
 */
export function readPendingRatingReviewIntent(
  storage: PendingIntentStorage,
  slug: string,
  consume: boolean,
) {
  try {
    const raw = storage.getItem(PENDING_RATING_REVIEW_INTENT_KEY);
    if (!raw) return null;
    const intent = parsePendingRatingReviewIntent(raw);
    if (!intent) {
      try {
        storage.removeItem(PENDING_RATING_REVIEW_INTENT_KEY);
      } catch {
        // An invalid value is ignored even when privacy settings prevent cleanup.
      }
      return null;
    }
    if (intent.slug !== slug) return null;
    if (consume) {
      try {
        storage.removeItem(PENDING_RATING_REVIEW_INTENT_KEY);
      } catch {
        // Without a successful claim, replay would no longer be exactly once.
        return null;
      }
    }
    return intent;
  } catch {
    return null;
  }
}
