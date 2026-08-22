import type { AdapterAccountType } from "@auth/core/adapters";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { userRoleEnum, userStatusEnum } from "./enums";

const timestampConfig = { mode: "date", withTimezone: true } as const;

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    googleId: text("google_id"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", timestampConfig),
    name: text("name"),
    image: text("image"),
    avatarKey: text("avatar_key"),
    role: userRoleEnum("role").default("READER").notNull(),
    status: userStatusEnum("status").default("ACTIVE").notNull(),
    ageGateAcceptedAt: timestamp("age_gate_accepted_at", timestampConfig),
    readingHistoryPrivate: boolean("reading_history_private").default(true).notNull(),
    libraryPrivate: boolean("library_private").default(true).notNull(),
    hideStoryTitleInNotification: boolean("hide_story_title_in_notification").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", timestampConfig),
    /**
     * Reading display preferences (theme, size, face, measure). Presentation
     * only — nothing here is authoritative for entitlements or progress, so it
     * is safe to let the client overwrite the whole blob. Nullable because a
     * reader who never opened the settings panel has nothing to sync, and the
     * device's own localStorage stays the fast path either way.
     */
    readerPrefs: jsonb("reader_prefs").$type<Record<string, unknown>>(),
    readerPrefsUpdatedAt: timestamp("reader_prefs_updated_at", timestampConfig),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", timestampConfig),
  },
  (table) => [
    uniqueIndex("users_google_id_uidx").on(table.googleId),
    uniqueIndex("users_email_lower_uidx").on(sql`lower(${table.email})`),
    index("users_status_created_idx").on(table.status, table.createdAt),
    index("users_role_status_idx").on(table.role, table.status),
    check("users_avatar_key_is_object_key", sql`${table.avatarKey} is null or (${table.avatarKey} !~ '://' and left(${table.avatarKey}, 1) <> '/')`),
    check(
      "users_deleted_status_consistent",
      sql`(${table.status} = 'DELETED') = (${table.deletedAt} is not null)`,
    ),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ name: "accounts_provider_account_pk", columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
    check("accounts_google_only", sql`${table.provider} = 'google'`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", timestampConfig).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId), index("sessions_expires_idx").on(table.expires)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", timestampConfig).notNull(),
  },
  (table) => [
    primaryKey({ name: "verification_tokens_identifier_token_pk", columns: [table.identifier, table.token] }),
    index("verification_tokens_expires_idx").on(table.expires),
  ],
);

// Auth.js expects this table in the adapter contract even though this deployment
// deliberately configures Google OAuth only and does not expose WebAuthn login.
export const authenticators = pgTable(
  "authenticators",
  {
    credentialID: text("credential_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: text("transports"),
  },
  (table) => [
    primaryKey({ name: "authenticators_user_credential_pk", columns: [table.userId, table.credentialID] }),
    index("authenticators_user_id_idx").on(table.userId),
    check("authenticators_counter_nonnegative", sql`${table.counter} >= 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
