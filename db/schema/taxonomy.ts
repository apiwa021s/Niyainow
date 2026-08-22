import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const timestampConfig = { mode: "date", withTimezone: true } as const;

const masterColumns = {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  nameTh: varchar("name_th", { length: 160 }).notNull(),
  nameEn: varchar("name_en", { length: 160 }).notNull(),
  descriptionTh: text("description_th"),
  descriptionEn: text("description_en"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
};

export const relationshipTypes = pgTable("relationship_types", masterColumns, (table) => [
  uniqueIndex("relationship_types_slug_uidx").on(table.slug),
  index("relationship_types_active_order_idx").on(table.isActive, table.sortOrder),
  check("relationship_types_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'`),
]);

export const storySettings = pgTable("story_settings", masterColumns, (table) => [
  uniqueIndex("story_settings_slug_uidx").on(table.slug),
  index("story_settings_active_order_idx").on(table.isActive, table.sortOrder),
  check("story_settings_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'`),
]);

export const tropes = pgTable("tropes", masterColumns, (table) => [
  uniqueIndex("tropes_slug_uidx").on(table.slug),
  index("tropes_active_order_idx").on(table.isActive, table.sortOrder),
  check("tropes_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'`),
]);

export const contentWarnings = pgTable("content_warnings", masterColumns, (table) => [
  uniqueIndex("content_warnings_slug_uidx").on(table.slug),
  index("content_warnings_active_order_idx").on(table.isActive, table.sortOrder),
  check("content_warnings_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'`),
]);