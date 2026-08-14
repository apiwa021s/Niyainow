import { z } from "zod";

export const MAX_SLUG_LENGTH = 180;

export const slugSchema = z
  .string()
  .min(1)
  .max(MAX_SLUG_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain lowercase ASCII letters, numbers, and single hyphens only");

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function trimSlug(value: string, maxLength: number) {
  return value.slice(0, maxLength).replace(/-+$/g, "");
}

/**
 * Produces an ASCII URL segment. Titles with no Latin transliteration receive a
 * deterministic hash suffix, so Thai-only input remains stable and non-empty.
 */
export function slugify(value: string, fallbackPrefix = "item") {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  const fallback = `${slugifyPrefix(fallbackPrefix)}-${stableHash(value.trim() || "item")}`;
  return trimSlug(normalized || fallback, MAX_SLUG_LENGTH);
}

function slugifyPrefix(value: string) {
  const prefix = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return prefix || "item";
}

export function withSlugSuffix(baseSlug: string, suffix: number) {
  const parsedBase = slugSchema.parse(baseSlug);
  if (!Number.isSafeInteger(suffix) || suffix < 2) {
    throw new TypeError("Slug suffix must be an integer greater than or equal to 2");
  }

  const tail = `-${suffix}`;
  return `${trimSlug(parsedBase, MAX_SLUG_LENGTH - tail.length)}${tail}`;
}

export type SlugExists = (slug: string) => boolean | Promise<boolean>;

/** Caller persists the returned slug and should not regenerate it on title edits. */
export async function createUniqueSlug(value: string, exists: SlugExists, fallbackPrefix = "item") {
  const baseSlug = slugify(value, fallbackPrefix);
  if (!(await exists(baseSlug))) return baseSlug;

  for (let suffix = 2; suffix <= 10_000; suffix += 1) {
    const candidate = withSlugSuffix(baseSlug, suffix);
    if (!(await exists(candidate))) return candidate;
  }

  throw new Error("Unable to allocate a unique slug after 10,000 attempts");
}
