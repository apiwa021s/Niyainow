import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { mediaKindEnum, mediaStatusEnum, userRoleEnum } from "./enums";

const timestampConfig = { mode: "date", withTimezone: true } as const;

export type MediaMetadata = {
  originalFileName?: string;
  checksumSha256?: string;
  [key: string]: unknown;
};

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectKey: text("object_key").notNull(),
    stagingKey: text("staging_key"),
    kind: mediaKindEnum("kind").notNull(),
    status: mediaStatusEnum("status").default("PENDING").notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    etag: text("etag"),
    metadata: jsonb("metadata").$type<MediaMetadata>().default({}).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", timestampConfig),
  },
  (table) => [
    uniqueIndex("media_assets_object_key_uidx").on(table.objectKey),
    uniqueIndex("media_assets_staging_key_uidx").on(table.stagingKey),
    index("media_assets_status_created_idx").on(table.status, table.createdAt),
    index("media_assets_status_updated_idx").on(table.status, table.updatedAt),
    index("media_assets_creator_idx").on(table.createdBy, table.createdAt.desc()),
    check(
      "media_assets_object_key_valid",
      sql`${table.objectKey} !~ '://' and left(${table.objectKey}, 1) <> '/' and ${table.objectKey} !~ '\\\\' and ${table.objectKey} !~ '(^|/)\\.\\.(/|$)'`,
    ),
    check(
      "media_assets_staging_key_valid",
      sql`${table.stagingKey} is null or ${table.stagingKey} ~ '^staging/(covers|banners|avatars|novels/assets|og)/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp|avif)$'`,
    ),
    check("media_assets_byte_size_positive", sql`${table.byteSize} > 0`),
    check("media_assets_dimensions_positive", sql`(${table.width} is null or ${table.width} > 0) and (${table.height} is null or ${table.height} > 0)`),
    check(
      "media_assets_content_type_allowed",
      sql`${table.contentType} in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')`,
    ),
  ],
);

export type AuditPayload = Record<string, unknown> | null;

/** Append-only security/administrative audit records. */
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorRole: userRoleEnum("actor_role"),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: text("entity_id"),
    before: jsonb("before").$type<AuditPayload>(),
    after: jsonb("after").$type<AuditPayload>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    requestId: varchar("request_id", { length: 120 }),
    ipHash: varchar("ip_hash", { length: 128 }),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    index("admin_audit_logs_actor_date_idx").on(table.actorId, table.createdAt.desc()),
    index("admin_audit_logs_entity_date_idx").on(table.entityType, table.entityId, table.createdAt.desc()),
    index("admin_audit_logs_action_date_idx").on(table.action, table.createdAt.desc()),
    index("admin_audit_logs_created_idx").on(table.createdAt.desc(), table.id),
  ],
);

export const siteSettings = pgTable(
  "site_settings",
  {
    key: varchar("key", { length: 160 }).primaryKey(),
    value: jsonb("value").$type<unknown>().notNull(),
    description: text("description"),
    isPublic: boolean("is_public").default(false).notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("site_settings_public_idx").on(table.isPublic, table.key),
    check("site_settings_key_format", sql`${table.key} ~ '^[a-z][a-z0-9_.-]{1,159}$'`),
  ],
);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
