# Database and storage foundation

PostgreSQL is the application source of truth. Drizzle schema modules live in
`db/schema`, and generated migrations are committed under `drizzle`. Runtime
connections use `postgres.js` through the lazy `getDb()` export in `db/index.ts`.
Importing the module does not require `DATABASE_URL`; the first actual database
operation does. This keeps credential-less production builds safe.

## Data model

- Identity: `users`, `accounts`, `sessions`, `verification_tokens`, and
  `authenticators` follow the Auth.js adapter column contract. Login is restricted
  to Google at both provider configuration and the `accounts_google_only` check.
  `users.google_id` is synchronized from the linked Google account by the auth
  sign-in flow; the accounts table remains the normalized OAuth identity record.
- Content: `novels`, `chapters`, `authors`, `genres`, `tags`, normalized junction
  tables, alternative titles, a search projection, and one-to-one novel counters.
  Chapter content is PostgreSQL `TEXT`. Decimal `chapter_number` is display data;
  `sort_order` is the only navigation order.
- Personal data: library states, follows, one upserted progress row per user/novel,
  compact reading history, ratings, reviews, review likes, coin wallets, an
  append-only coin ledger, and permanent chapter entitlements. Composite foreign
  keys prevent a progress/history chapter from belonging to another novel.
- Analytics: daily engagement rollups and precomputed daily/weekly/monthly/all-time
  rankings. Public ranking requests read snapshots rather than aggregating events.
- Operations: R2 media lifecycle records (object keys only), append-only admin
  audit logs, and JSON site settings.

Important database invariants include URL-safe stable slugs, one primary genre,
one rating/review/library record per user and novel, non-empty published chapters,
exact free/paid price consistency, published/scheduled timestamps, same-novel
latest chapter ownership, and nonnegative counters. Reader and listing indexes are
partial where useful so deleted/draft records do not inflate hot indexes. The
global admin chapter catalogue uses a partial `(updated_at DESC, id DESC)` index
over non-deleted rows, matching its stable default pagination order.

## Search

`novel_search_documents.search_text` is a write-transaction-maintained projection
of primary/original/alternative titles, authors, genres, and tags. The initial
migration enables `pg_trgm` and creates a GIN trigram index, which supports Thai
and Latin substring queries. Keep search access behind the data layer so this
projection can later be replaced by a dedicated search service without changing
page code.

## Migration and local seed

```powershell
npx.cmd drizzle-kit check
npx.cmd drizzle-kit generate
npx.cmd drizzle-kit migrate
$env:NODE_ENV='development'; $env:ALLOW_DEVELOPMENT_SEED='true'; npx.cmd tsx db/seed.ts
```

Run migration and seed commands with `DATABASE_URL` configured. The development
seed is idempotent and imports the current UI mock catalog only as input. It seeds
genres, tags, fictional authors/novels, chapter text, counters, search documents,
and basic site settings. It deliberately does not create users and does not copy
remote mock image URLs into R2 key columns. It fails closed unless
`ALLOW_DEVELOPMENT_SEED=true` and also refuses `NODE_ENV=production`; never expose
that opt-in in a production secret set.

## Transaction boundaries

The application service layer must keep these operations atomic:

1. Publishing/unpublishing a chapter updates the chapter, `novel_statistics`
   counts/latest chapter, `novels.latest_chapter_at`, and search/cache invalidation.
2. Rating upsert/delete updates `rating_sum`, `rating_count`, and the derived
   average in the same transaction.
3. Library/follow mutations update their matching aggregate counter exactly once.
4. Browser media is uploaded only to `staging/{final-key}`. It becomes `READY`
   only through a conditional `PENDING -> VERIFYING -> READY` claim, an ETag-bound
   R2 `HEAD` plus ranged magic-byte verification, a conditional same-bucket copy
   to the final allowlisted key, and staging cleanup.
5. A chapter unlock locks the user's wallet, rechecks the current published price,
   debits the wallet, appends one idempotent ledger entry, and creates the matching
   entitlement in one transaction. Paid chapter bodies are selected only through
   that entitlement (or an active editor/admin privilege check), never from a
   shared cache.

Engagement writes apply constant-time deltas while holding the per-novel
statistics lock; they do not recount an unbounded user table in the request path.
`db/reconcile-engagement.ts` is the bounded drift-repair job. It uses stable
keyset progress stored in `site_settings`, defaults to dry-run, and is scheduled by
`.github/workflows/reconcile-engagement.yml`. Run `--execute` only from one
approved production scheduler.

## Media cleanup

`db/cleanup-media.ts` is a bounded, idempotent lifecycle command. It defaults to
dry-run; pass `--execute` only from an approved durable cron/job. It expires stale
pending/failed/orphaned rows, deletes leftover staging and untracked managed keys,
and persists the object-list cursor in private site settings. Novel replacement
and deletion mutations mark detached cover/banner rows `ORPHANED` directly. Use
`--reconcile-unattached-ready --ready-grace-hours=168` weekly as a conservative
repair for abandoned `READY` rows. Exact commands and the required CDN
`/staging/*` deny rule are documented in `docs/operations.md`. The
committed `.github/workflows/media-cleanup.yml` provides the hourly and weekly
scheduled invocations plus a manual dry-run.

Automatic unattached-READY inference covers only normalized `COVER`, `BANNER`, and
`AVATAR` references. Free-form `NOVEL_ASSET`/`OG` owners must mark replaced media
`ORPHANED` explicitly; the generic object scan then performs bounded deletion.

Lifecycle cleanup changes claimed rows to `ORPHANED` before deleting R2. READY
reconciliation locks and rechecks references in the same transaction; novel
mutations take the same media-row locks before accepting an asset. This ordering
prevents cleanup from deleting an object while a concurrent transaction attaches
it. Failed storage deletes remain `ORPHANED` and are safe to retry.

`updated_at` is maintained by Drizzle's runtime `$onUpdate` behavior. Any future
direct SQL writer must set it explicitly (or add database triggers) rather than
assuming PostgreSQL updates it automatically.
