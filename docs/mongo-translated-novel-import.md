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

Large books are imported in chunks. `--chapter-limit=100` means at most 100
source chapters per book are processed before progress can be saved. The runtime
guard stops the command gracefully before the platform timeout and exits
successfully with `stoppedForRuntime: true`.

Normal execute runs require `MONGODB_URL`, `DATABASE_URL`, and the four `R2_*`
credentials. Available, valid cover images are uploaded to R2 before
`novels.cover_key` is written. Use `--skip-images` only for controlled recovery
runs.

Mongo source chapters with `chapterPrice > 0` are imported as locked PostgreSQL
chapters with `is_free = false` and `coin_price = 1` regardless of the original
Mongo price.

Incremental sync only imports newly appended source chapters by starting from the
highest chapter number already present in PostgreSQL for that book. Existing
chapter edits in Mongo are not treated as a primary sync signal.
