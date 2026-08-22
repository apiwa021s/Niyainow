import { describe, expect, it } from "vitest";

import { findMissingAuthSchema } from "@/db/auth-schema-readiness";

const completeRows = [
  ...["id", "google_id", "email", "email_verified", "name", "image", "avatar_key", "role", "status", "age_gate_accepted_at", "reading_history_private", "library_private", "hide_story_title_in_notification", "last_login_at", "reader_prefs", "reader_prefs_updated_at", "created_at", "updated_at", "deleted_at"].map((columnName) => ({ tableName: "users", columnName })),
  ...["user_id", "type", "provider", "provider_account_id", "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state"].map((columnName) => ({ tableName: "accounts", columnName })),
  ...["session_token", "user_id", "expires"].map((columnName) => ({ tableName: "sessions", columnName })),
];

describe("authentication schema readiness", () => {
  it("accepts the complete Auth.js schema", () => {
    expect(findMissingAuthSchema(completeRows)).toEqual([]);
  });

  it("reports exact missing table columns", () => {
    const rows = completeRows.filter((row) => row.columnName !== "age_gate_accepted_at" && row.tableName !== "sessions");
    expect(findMissingAuthSchema(rows)).toEqual([
      "users.age_gate_accepted_at",
      "sessions.session_token",
      "sessions.user_id",
      "sessions.expires",
    ]);
  });
});
