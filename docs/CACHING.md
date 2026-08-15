# Redis and application caching

## Architecture

The application uses the cache layers for different jobs instead of putting every response in every cache:

```text
Browser
  |
  v
Cloudflare asset CDN / Vercel route delivery
  |
  v
Next.js Data Cache (public, reusable queries only)
  |
  v
Redis application cache (shared across function instances)
  |
  v
PostgreSQL (source of truth)
```

Next.js 16.3 is running without the `cacheComponents` flag, so the project keeps the supported previous-model APIs: `unstable_cache`, `revalidateTag`, and React `cache`. Redis is the shared L2/fallback for hot public data when the Next Data Cache is cold or deliberately absent. User-specific data stays outside both shared caches.

## Performance audit

Counts below are SQL statements on a completely cold public service path, before request memoization or either persistent cache. Conditional auth/user queries are excluded. They are derived from the actual Drizzle call graph; they are not benchmark results.

| Route/resource | Cold SQL statements | Dynamic route? | Cacheable? | Traffic | Implemented cache |
| --- | ---: | --- | --- | --- | --- |
| `/` public homepage sections | up to 31 | Yes, due personalization | Public sections only | Very high | Next Data Cache + Redis; user personalization uncached |
| `/novel/[slug]` public content | up to 13 | Yes, due user state | Yes | Very high | Next Data Cache for novel + Redis for novel, first/latest chapters, similar titles, reviews |
| `/novel/[slug]/chapters` | 7 | Yes | Yes | High | Redis chapter-page cache + Next/Redis novel cache |
| `/novel/[slug]/chapter/[chapter]` | 11 | Yes, auth checked per request | Public-safe payload only | Very high | Redis reader bundle + chapter-list cache + Next/Redis novel cache |
| `/genre/[slug]` | up to 16 | Yes, filters | Single canonical genre only | High | Redis genre/detail/facet/page cache; rankings also use Next + Redis |
| `/rankings` | up to 7 | Yes, period query | Yes | High | Next Data Cache + Redis |
| `/updates` generic | up to 7 | Yes, filters | Finite generic ranges only | High | Next Data Cache + Redis; genre/follow sets bypass shared update cache |
| `/search` | up to 8 | Yes | Not by default | Variable | Bypass; prevents attacker-controlled key cardinality |

Important findings from the audit:

- The reader previously requested novel metadata, chapter content, three navigation queries, and a 50-row chapter page for every cold function instance. The content plus previous/next result is now one Redis reader object and one coalesced regeneration.
- Novel detail previously loaded a 50-row chapter page just to find the first chapter. Limits below 50 now use an explicit `LIMIT n` query and their own cache key.
- Previous/next navigation already used indexed `sort_order` lookups rather than loading the complete chapter list. That query shape was preserved and cached with the reader payload.
- The schema already has public novel, chapter navigation, ranking, taxonomy, and search indexes. No speculative index was added.
- Homepage queries already execute concurrently and use Next Data Cache. Redis version reads are coalesced in process, and invalidations use one Redis transaction/pipeline. The cache abstraction also exposes `mGet` for future aggregates; no sequential Redis loop was introduced for the homepage.
- Proxy matching is already limited to authenticated/admin route groups and does not run on public reading pages or assets.
- R2 asset URLs use the configured public CDN host and there is no Vercel `/api/image` byte-proxy route. `next/image` still performs configured image optimization; switching to Cloudflare image transformations requires a real transformation URL/loader and was not guessed.
- Reading progress is already gated by authentication, a 5% meaningful change, and a 10-second minimum interval, with page-hide persistence. It was not rewritten.
- View events currently write PostgreSQL aggregates. There is no durable counter-flush worker, so Redis view buffering was deliberately not introduced.

## Cache keys

The prefix defaults to `niyainow:v1` and can be changed with `REDIS_CACHE_PREFIX`. Dynamic segments are normalized/encoded; filter combinations are SHA-256 digests. Application code must use `lib/redis/keys.ts` and must never use `KEYS *`.

| Pattern | Purpose |
| --- | --- |
| `{prefix}:novel:{slug}:v{novelVersion}:t{taxonomyVersion}` | Public novel detail |
| `{prefix}:novel-related:{slug}:{resource}:v{catalogVersion}:{argument}` | Similar novels and published reviews |
| `{prefix}:chapter-reader:{slug}:v{chapterVersion}:chapter:{number}` | Public-safe chapter, excerpt/content, previous and next |
| `{prefix}:chapter-list:{slug}:v{chapterVersion}:page:{page}` | Paginated published chapter list |
| `{prefix}:chapter-first:{slug}:v{chapterVersion}:limit:{limit}` | Small first-chapter lookup |
| `{prefix}:chapter-latest:{slug}:v{chapterVersion}:limit:{limit}` | Latest chapter summaries |
| `{prefix}:catalog:v{catalogVersion}:{digest}` | Generic/single-genre catalog page |
| `{prefix}:home:{section}:v{homeVersion}:{argument}` | Public homepage section |
| `{prefix}:ranking:{period}:v{rankingVersion}:limit:{limit}` | Public ranking |
| `{prefix}:taxonomy:{resource}:v{taxonomyVersion}:{argument}` | Genres, genre detail, facets |
| `{prefix}:banner:v{bannerVersion}:limit:{limit}` | Active banners |
| `{cacheKey}:lock` | Short distributed regeneration lock |
| `{prefix}:version:*` | Version counters used for O(1) collection invalidation |

Old versioned values expire naturally. No request or mutation path scans or flushes Redis.

## TTL policy

All write TTLs receive bounded jitter of approximately +/-10% to avoid synchronized expiry.

| Resource | Base Redis TTL | Reason |
| --- | ---: | --- |
| Novel detail | 15 minutes | Metadata is read-heavy; explicit mutation invalidation |
| Chapter list/first/latest | 10 minutes | Publishing invalidates the per-novel version |
| Reader payload | 1 hour | Published content is stable; shorter security/failure bound plus explicit invalidation |
| Homepage latest/updates | 90 seconds | Fast publishing visibility |
| Homepage ranking/recommended | 3 minutes | Aggregate data tolerates short staleness |
| Other homepage catalog data | 5 minutes | Shared catalog freshness |
| Genre page/facets | 5 minutes | Bounded editorial taxonomy/filter space |
| Taxonomy | 10 minutes | Low write frequency |
| Rankings | 5 minutes | Aggregate statistics |
| Banners | 60 seconds | Start/end scheduling window |

Items larger than `REDIS_MAX_ITEM_BYTES` (1 MiB by default) are returned normally but not cached. Only the byte count and low-cardinality category are logged.

## Invalidation

PostgreSQL commits first. Next.js tag invalidation and Redis invalidation run only after the transaction succeeds.

| Mutation | Redis invalidation | Next.js invalidation |
| --- | --- | --- |
| Novel create/edit/unpublish/delete | bump novel, chapter, catalog, homepage, ranking versions; taxonomy when relations can change | immediately expire public novel/chapter/search/ranking/sitemap tags |
| Chapter create/edit/publish/unpublish/delete | bump novel-specific chapter and novel versions plus catalog/home/ranking | immediately expire public novel/chapter/search/ranking/sitemap tags |
| Genre create/edit/deactivate | bump taxonomy, catalog, homepage | immediately expire taxonomy/search/sitemap/novel tags |
| Banner create/edit/delete | bump banner version | immediately expire banner tag |
| Library/follow/rating/review aggregate change | bump affected novel plus catalog/home/ranking | SWR for aggregate tags; published review removal is immediate |

Version counters avoid hundreds of deletes. Lock release uses a Lua compare-and-delete operation, so one request cannot release another request's lock.

## Failure behavior and stampede protection

- The client is lazy and reused through `globalThis`; requests do not create one TCP connection each.
- `REDIS_TIMEOUT_MS` covers connection and command waits. The default is 75 ms.
- A cache connection/command error is sampled in logs at most once per minute. Passwords and connection URLs are never logged.
- On any cache read error, the loader queries PostgreSQL and the public request continues. Cache write/invalidation errors do not roll back a committed database mutation.
- Concurrent misses coalesce through an in-process promise map. Cross-instance regeneration uses `SET NX PX` with a 3-second lock and short bounded retry (20/40/80 ms), then falls back rather than blocking a reader indefinitely.
- Redis is not authoritative. Restarting or evicting it can only reduce performance, not lose catalog/content data.

## Security rules

- Profiles, sessions, purchases/entitlements, library state, follows, reading progress, bookmarks, notifications, admin data, and authorization results are never put in the shared application cache.
- The current product does not unlock paid chapters. The public SQL projection returns full content only when `is_free = true`; otherwise it returns at most the editorial excerpt. `toPublicChapterCachePayload` copies only that public projection into Redis.
- Auth is still checked per reader request for UI/user state. A cached public payload cannot turn a locked chapter into an unlocked one.
- Search text, follow sets, arbitrary tag/filter combinations, and other user-cardinality inputs bypass the shared persistent cache.

## Configuration

Either configure `REDIS_URL` or the discrete host fields. `REDIS_URL` takes precedence.

```dotenv
CACHE_ENABLED=true
REDIS_ENABLED=true
REDIS_URL=
REDIS_HOST=cache.internal.example
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_DATABASE=0
REDIS_SSL=true
REDIS_TIMEOUT_MS=75
REDIS_DEBUG=false
REDIS_CACHE_PREFIX=niyainow
REDIS_MAX_ITEM_BYTES=1048576
```

Set `CACHE_ENABLED=false` for an immediate application-level bypass. If `REDIS_ENABLED=true` but neither endpoint is present, caching is disabled and a sampled configuration warning is emitted.

## Operations and observability

The process tracks `hit`, `miss`, `error`, `write`, `invalidate`, and `bypass` counters by low-cardinality category. `getCacheMetricsSnapshot()` exposes an internal snapshot for telemetry integration; no unauthenticated metrics endpoint is created. `REDIS_DEBUG=true` enables connection lifecycle debug logs only.

For a dedicated cache Redis instance:

- set `maxmemory` from measured working-set size with operational headroom;
- prefer `allkeys-lfu` for this read-heavy cache workload;
- alert on `used_memory/maxmemory`, evictions, rejected connections, connected clients, command latency, error rate, and hit ratio;
- inspect `INFO memory`, `INFO stats`, and connection metrics operationally, never from request paths;
- do not use `FLUSHALL`, `FLUSHDB`, or wildcard key deletion in application operations.

## Benchmark procedure

The repository includes a dependency-free HTTP load runner. Use a production-like database/Redis and an isolated staging deployment; do not benchmark editorial mutations.

```bash
npm run benchmark:cache -- --base-url https://staging.example.com --slug example-novel --chapter 1 --duration 30 --concurrency 30
```

Run once against a deployment with `CACHE_ENABLED=false`, restart with it enabled, warm both consistently, and retain the JSON output. The runner reports requests/second, average, p95, p99, error rate, and response bytes for `/`, novel detail, chapter list, and reader routes. Correlate the run with PostgreSQL query metrics, Redis hit/latency metrics, and Vercel function duration. No before/after numbers are recorded here because this workspace has no running production-like database/Redis target; inventing results would be misleading.

## Remaining work

- P1: replace process-local abuse rate limits with a separate Redis-backed limiter after endpoint-specific fail-open/fail-closed policy is approved.
- P1: add a durable scheduled-publication worker; the schema has queue indexes, but no worker currently promotes `SCHEDULED` rows to `PUBLISHED`.
- P1: evaluate a Cloudflare image transformation loader using the real CDN transformation contract before bypassing Next Image optimization.
- P2: consider Redis view counters only together with a durable, idempotent scheduled flush/reconciliation job.
- P2: export cache counters to the production telemetry system once its vendor/collector is selected.
