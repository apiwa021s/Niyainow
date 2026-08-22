import { pgEnum } from "drizzle-orm/pg-core";

export const USER_ROLES = ["READER", "EDITOR", "ADMIN"] as const;
export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED", "DELETED"] as const;
export const NOVEL_STATUSES = ["ONGOING", "COMPLETED", "HIATUS", "CANCELLED"] as const;
export const PUBLICATION_STATUSES = ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export const CONTENT_RATINGS = ["EVERYONE", "TEEN", "MATURE", "ADULT"] as const;
export const CHAPTER_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"] as const;
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
export const COIN_BUCKETS = ["PAID", "BONUS", "PROMO"] as const;
export const WRITER_STATUSES = ["ACTIVE", "SUSPENDED", "CLOSED"] as const;
export const STORY_TYPES = ["serial", "complete_novel", "oneshot", "anthology"] as const;
export const CONTENT_ORIGIN_TYPES = ["original", "licensed_translation", "licensed_adaptation"] as const;
export const CHAPTER_ACCESS_MODES = ["free", "paid", "early_access", "members_only"] as const;
export const PUBLIC_ACCESS_MODES = ["free", "paid"] as const;
export const MEMBERSHIP_PLAN_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"] as const;
export const MEMBERSHIP_STATUSES = ["active", "cancel_at_period_end", "expired", "past_due", "cancelled"] as const;
export const POST_VISIBILITIES = ["public", "followers", "members"] as const;
export const POST_STATUSES = ["draft", "published", "archived"] as const;
export const MODERATION_STATES = ["active", "under_review", "restricted", "removed"] as const;
export const REVENUE_CONTRACT_TYPES = ["standard", "founding_author", "exclusive", "custom"] as const;
export const REVENUE_SOURCES = ["chapter_unlock", "membership_subscription", "creator_bonus", "adjustment", "refund_reversal"] as const;
export const REVENUE_STATUSES = ["pending", "available", "reserved", "settled", "reversed"] as const;
export const CREATOR_LEDGER_TYPES = ["chapter_unlock", "membership_subscription", "creator_bonus", "adjustment", "refund_reversal"] as const;
export const NOTIFICATION_TYPES = [
  "new_chapter",
  "new_story_from_writer",
  "writer_post",
  "early_access",
  "membership",
  "coin_purchase",
  "chapter_purchase",
  "chapter_published",
  "scheduled_publish",
  "fan_summary",
  "membership_summary",
  "earnings_summary",
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
export const coinBucketEnum = pgEnum("coin_bucket", COIN_BUCKETS);
export const writerStatusEnum = pgEnum("writer_status", WRITER_STATUSES);
export const storyTypeEnum = pgEnum("story_type", STORY_TYPES);
export const contentOriginTypeEnum = pgEnum("content_origin_type", CONTENT_ORIGIN_TYPES);
export const chapterAccessModeEnum = pgEnum("chapter_access_mode", CHAPTER_ACCESS_MODES);
export const publicAccessModeEnum = pgEnum("public_access_mode", PUBLIC_ACCESS_MODES);
export const membershipPlanStatusEnum = pgEnum("membership_plan_status", MEMBERSHIP_PLAN_STATUSES);
export const membershipStatusEnum = pgEnum("membership_status", MEMBERSHIP_STATUSES);
export const postVisibilityEnum = pgEnum("post_visibility", POST_VISIBILITIES);
export const postStatusEnum = pgEnum("post_status", POST_STATUSES);
export const moderationStateEnum = pgEnum("moderation_state", MODERATION_STATES);
export const revenueContractTypeEnum = pgEnum("revenue_contract_type", REVENUE_CONTRACT_TYPES);
export const revenueSourceEnum = pgEnum("revenue_source", REVENUE_SOURCES);
export const revenueStatusEnum = pgEnum("revenue_status", REVENUE_STATUSES);
export const creatorLedgerTypeEnum = pgEnum("creator_ledger_type", CREATOR_LEDGER_TYPES);
export const notificationTypeEnum = pgEnum("notification_type", NOTIFICATION_TYPES);

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type NovelStatus = (typeof NOVEL_STATUSES)[number];
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export type ChapterStatus = (typeof CHAPTER_STATUSES)[number];
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];
export type CoinLedgerType = (typeof COIN_LEDGER_TYPES)[number];
export type ChapterAccessMode = (typeof CHAPTER_ACCESS_MODES)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
export type RevenueStatus = (typeof REVENUE_STATUSES)[number];
