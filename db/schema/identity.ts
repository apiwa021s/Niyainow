import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./auth";
import { writerStatusEnum } from "./enums";

const timestampConfig = { mode: "date", withTimezone: true } as const;

export const writerProfiles = pgTable(
  "writer_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    username: varchar("username", { length: 80 }).notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    bio: text("bio"),
    avatarKey: text("avatar_key"),
    coverKey: text("cover_key"),
    featuredNovelId: uuid("featured_novel_id"),
    status: writerStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("writer_profiles_user_uidx").on(table.userId),
    uniqueIndex("writer_profiles_username_lower_uidx").on(sql`lower(${table.username})`),
    index("writer_profiles_status_created_idx").on(table.status, table.createdAt),
    check("writer_profiles_username_format", sql`${table.username} ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'`),
    check("writer_profiles_avatar_key_is_object_key", sql`${table.avatarKey} is null or (${table.avatarKey} !~ '://' and left(${table.avatarKey}, 1) <> '/')`),
    check("writer_profiles_cover_key_is_object_key", sql`${table.coverKey} is null or (${table.coverKey} !~ '://' and left(${table.coverKey}, 1) <> '/')`),
  ],
);

export type WriterProfile = typeof writerProfiles.$inferSelect;