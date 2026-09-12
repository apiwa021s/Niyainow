import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgTable, real, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./auth";

const timestampConfig = { mode: "date", withTimezone: true } as const;

export const worldCharacters = pgTable(
  "world_characters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 24 }).notNull(),
    bodyPreset: varchar("body_preset", { length: 32 }).notNull(),
    skinTone: varchar("skin_tone", { length: 32 }).notNull(),
    faceId: varchar("face_id", { length: 32 }).notNull(),
    eyeId: varchar("eye_id", { length: 32 }).notNull(),
    hairId: varchar("hair_id", { length: 32 }).notNull(),
    hairColor: varchar("hair_color", { length: 32 }).notNull(),
    topId: varchar("top_id", { length: 32 }).notNull(),
    bottomId: varchar("bottom_id", { length: 32 }).notNull(),
    shoesId: varchar("shoes_id", { length: 32 }).notNull(),
    accessoryIds: jsonb("accessory_ids").$type<string[]>().default([]).notNull(),
    title: varchar("title", { length: 48 }),
    currentWorld: varchar("current_world", { length: 64 }).default("novelnow-central").notNull(),
    x: real("x").default(1200).notNull(),
    y: real("y").default(1260).notNull(),
    introCompleted: boolean("intro_completed").default(false).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
    lastSeenAt: timestamp("last_seen_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("world_characters_user_uidx").on(table.userId),
    uniqueIndex("world_characters_display_name_lower_uidx").on(sql`lower(${table.displayName})`),
    index("world_characters_world_seen_idx").on(table.currentWorld, table.lastSeenAt.desc(), table.id),
    check("world_characters_position_finite", sql`${table.x} between 0 and 100000 and ${table.y} between 0 and 100000`),
    check("world_characters_accessories_array", sql`jsonb_typeof(${table.accessoryIds}) = 'array'`),
    check("world_characters_display_name_not_blank", sql`length(btrim(${table.displayName})) >= 2`),
  ],
);
