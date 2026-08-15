# Performance architecture

## Rendering

- Next.js 16 Cache Components and Partial Prefetching are enabled globally.
- Public, account, reader, and admin pages produce a Partial Prerendered app
  shell. Request-bound session data streams from explicit Suspense boundaries.
- The home page renders its public catalogue independently from account
  personalization, so authentication and user queries do not hold back the
  public feed.
- Route-specific loading UI preserves the real layout for novel details,
  chapter indexes, reader pages, and taxonomy browse pages.

## Data and cost controls

- PostgreSQL remains the source of truth. Next's Data Cache and Redis form the
  shared read-through layers described in `docs/CACHING.md`.
- Public list links use Partial Prefetching's shared route shell. Explicit
  runtime prefetch is reserved for the reader's likely next chapter after the
  reader reaches 50%; large chapter lists deliberately disable prefetch.
- Search suggestions are debounced and abort superseded requests. The endpoint
  is rate limited and CDN-cacheable for 60 seconds with stale-while-revalidate.
- User and admin APIs explicitly enter request-time rendering, avoiding failed
  prerender attempts and misleading error logs.

## Browser delivery

- Large feed/card trees are Server Components. Only controls such as filters,
  bookmarks, carousels, and reader settings hydrate.
- Offscreen catalogue sections use `content-visibility: auto` to defer browser
  layout and paint work.
- Next Image serves AVIF/WebP from a constrained asset origin. UUID asset keys
  allow a 31-day optimized-image cache safely; the configured width set limits
  unnecessary variants.
- The above-the-fold UI and heading fonts are preloaded. Reader alternatives
  load only when selected, and labels use the system monospace stack.

## Verification and production measurement

The production build must keep pages marked `◐` (Partial Prerender) rather than
regressing to fully dynamic rendering. Run:

```powershell
npm run lint
npm run typecheck
npm test
npm run db:check
npm run build
```

Synthetic scores vary by database, Redis, deployment region, CDN state, and
real media. Record p75 mobile LCP, INP, and CLS in the production analytics
platform after deployment; do not treat a local Lighthouse run as the sole
release gate.
