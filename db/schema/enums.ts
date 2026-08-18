import { pgEnum } from "drizzle-orm/pg-core";

export const USER_ROLES = ["READER", "EDITOR", "ADMIN"] as const;
export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED", "DELETED"] as const;
export const NOVEL_STATUSES = ["ONGOING", "COMPLETED", "HIATUS", "CANCELLED"] as const;
export const PUBLICATION_STATUSES = ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export const CONTENT_RATINGS = ["EVERYONE", "TEEN", "MATURE", "ADULT"] as const;
export const CHAPTER_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export const AUTHOR_ROLES = ["AUTHOR", "ORIGINAL_AUTHOR", "TRANSLATOR", "EDITOR"] as const;
export const LIBRARY_STATUSES = ["READING", "PLAN_TO_READ", "COMPLETED", "DROPPED"] as const;
export const REVIEW_STATUSES = ["PENDING", "PUBLISHED", "HIDDEN", "REJECTED"] as const;
export const RANKING_PERIODS = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"] as const;
export const MEDIA_KINDS = ["COVER", "BANNER", "AVATAR", "NOVEL_ASSET", "OG"] as const;
export const MEDIA_STATUSES = ["PENDING", "VERIFYING", "READY", "FAILED", "ORPHANED"] as const;
export const COIN_LEDGER_TYPES = [
  "TOP_UP",
  "ADMIN_CREDIT",
  "PROMOTION",
  "CHAPTER_UNLOCK",
  "REFUND",
  "ADJUSTMENT",
] as const;

export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const userStatusEnum = pgEnum("user_status", USER_STATUSES);
export const novelStatusEnum = pgEnum("novel_status", NOVEL_STATUSES);
export const publicationStatusEnum = pgEnum("publication_status", PUBLICATION_STATUSES);
export const contentRatingEnum = pgEnum("content_rating", CONTENT_RATINGS);
export const chapterStatusEnum = pgEnum("chapter_status", CHAPTER_STATUSES);
export const authorRoleEnum = pgEnum("author_role", AUTHOR_ROLES);
export const libraryStatusEnum = pgEnum("library_status", LIBRARY_STATUSES);
export const reviewStatusEnum = pgEnum("review_status", REVIEW_STATUSES);
export const rankingPeriodEnum = pgEnum("ranking_period", RANKING_PERIODS);
export const mediaKindEnum = pgEnum("media_kind", MEDIA_KINDS);
export const mediaStatusEnum = pgEnum("media_status", MEDIA_STATUSES);
export const coinLedgerTypeEnum = pgEnum("coin_ledger_type", COIN_LEDGER_TYPES);

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type NovelStatus = (typeof NOVEL_STATUSES)[number];
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export type ChapterStatus = (typeof CHAPTER_STATUSES)[number];
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];
export type CoinLedgerType = (typeof COIN_LEDGER_TYPES)[number];
