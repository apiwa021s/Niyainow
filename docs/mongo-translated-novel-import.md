# Mongo translated-novel import

`db/import-translated-novels.ts` imports only verified, published translated
novels from MongoDB database `my-novel`:

```js
{
  category: "novel",
  subCategory: { $in: ["fan_club", "copyright"] },
  status: "verified",
  isPublished: true,
  deletedAt: null
}
```

The job is bounded and resumable. It stores both backfill and incremental sync
state in private `site_settings` key `jobs.mongo_translated_novel_import.cursor`.
Progress is saved after each completed book or chapter chunk, so a timeout does
not force the next run to repeat a whole batch.

## Admin Auto sync

On `/admin/sync`, **Auto sync** sends one bounded request at a time and starts
the next request only after the previous request has saved its cursor. During
the initial import it continues until the captured backfill snapshot is
complete. Once backfill is complete, the same button drains a due or already
active incremental sweep and otherwise returns as up to date.

Keep the browser tab open while this controller is running. **Stop after this
batch** lets the current request finish and then pauses; pressing Auto sync
again resumes from the persisted cursor. Closing the tab only stops the browser
controller—the bounded server request may finish and save its cursor. The
scheduled workflow remains the durable way to continue work when no browser is
open.

The controller retries temporary network, timeout, rate-limit, server, and
active-worker responses with bounded backoff. Authentication/validation errors
stop immediately. It also pauses after three successful requests with an
unchanged cursor rather than spinning forever.

Dry-run:

```powershell
npm.cmd run db:import-translated-novels -- --mode=auto --limit=5 --chapter-limit=100 --max-runtime-seconds=600
```

Execute:

```powershell
npm.cmd run db:import-translated-novels -- --execute --mode=auto --limit=5 --chapter-limit=100 --max-runtime-seconds=600
```

Modes:

- `auto`: continue backfill until all translated novels are imported; after
  that, run incremental sync only when the two-day interval is due.
- `backfill`: only continue the initial full import.
- `incremental`: scan Mongo books updated since the last sweep, with a six-hour
  safety window.

The first executed backfill captures the greatest eligible source `bookId` as
its high-water mark. Books added later do not make the initial target move and
are picked up by a later incremental sweep.

All browser, CLI, and scheduled executions share the private
`jobs.mongo_translated_novel_import.lease` row. Lease acquisition and renewal
use row locks, and both content writes and cursor checkpoints verify the same
lease owner in their transactions. A competing runner receives HTTP `409` with
`Retry-After`; an expired/stale runner cannot write content or regress the
cursor after a new worker takes over.

Large books are imported in chunks. `--chapter-limit=100` means at most 100
source chapters per book are processed before progress can be saved. The runtime
guard stops the command gracefully before the platform timeout and exits
successfully with `stoppedForRuntime: true`.

Normal execute runs require `MONGODB_URL`, `DATABASE_URL`, and the four `R2_*`
credentials. As in the original importer, cover URLs stored in Mongo may use
HTTP or HTTPS and redirects are followed. Available images are streamed through
a hard size limit and uploaded to R2 before `novels.cover_key` is written. Use
`--skip-images` only for controlled recovery runs.

Mongo source chapters with `chapterPrice > 0` are imported as locked PostgreSQL
chapters with `is_free = false` and `coin_price = 1` regardless of the original
Mongo price.

Imported novels and chapters store the exact Mongo `bookId` and `chapterId` in
nullable, unique source-identity columns. Public novel slugs, chapter numbers,
chapter slugs, and sort order are allocated once and remain stable. A later
source rename updates display content without changing the URL; a later source
reorder does not swap chapter bodies or invalidate reading-progress references.

Incremental sync performs a bounded identity sweep from source offset zero for
each changed book. Existing IDs are updated in place and genuinely new IDs are
appended. This costs more work than trusting positional offsets but makes
retries, source edits, and reordering idempotent.

Rows created by importer versions before the source-ID migration are claimed
only when their legacy slug/title or positional chapter slug/title/content match
exactly. A mismatch fails with `SYNC_IDENTITY_CONFLICT`; reconcile that row
explicitly instead of allowing the importer to guess and potentially attach a
Mongo ID to the wrong content.

The current incremental sweep imports eligible source records; it is not yet a
tombstone reconciliation job. If a source novel/chapter is removed, deleted,
unverified, or otherwise becomes ineligible, an administrator must immediately
unpublish the corresponding PostgreSQL content. Keep it unpublished until a
separate bounded, audited tombstone reconciliation job is implemented.
