# NovelNow reader security audit

Audit date: 2026-09-11 (Asia/Bangkok)

## Executive summary

The original code already had a strong public/private data split: the shared reader cache selected full content only for free chapters and selected at most a 1,200-character editorial excerpt for paid chapters. Paid body queries were server-only, published-state constrained, and user-bound. No full paid body was found in localStorage, sessionStorage, Zustand reader state, public story/chapter catalogs, or the shared Redis/Next.js cache path.

The largest practical gaps were an unpatched Next.js release and the absence of application-level controls on the actual chapter page and read APIs. The implementation now upgrades Next.js, centralizes current-chapter entitlement, validates identifiers, adds session-aware sliding-window detection and safe responses, records security events, and exposes Redis-backed metrics through an admin-only endpoint.

## Architecture audited

- Next.js 16 App Router with Cache Components and partial prefetching; React 19.2.
- Auth.js v5 database sessions through the Drizzle adapter and Google OAuth.
- PostgreSQL through Drizzle ORM; Redis is optional and is already the shared cache/coordination provider.
- Public reader page: `/novel/[slug]/chapter/[chapter]`.
- Chapter APIs: `/api/chapters/[id]/access`, `/api/chapters/[id]/content`, `/api/chapters/[id]/unlock`.
- Purchase paths: coin unlock Route Handler and Server Action; the debit, ledger entry, and entitlement are committed in one database transaction.
- Next.js shared caches contain novel metadata, chapter metadata, free content, and paid editorial excerpts only. Personalized full content is `private, no-store` and is never put in a shared cache.
- Admin and Studio content paths are separately protected by database-authoritative role/capability checks and are not public reader paths.

## Findings and disposition

### CRITICAL

1. **Next.js 16.3.0 was below the current security-patched Active LTS release.** The project enables AVIF image optimization and was therefore in scope for GHSA-2xp9-vwfh-vxw4; Windows-hosted builds were also in scope for CVE-2026-75604 / GHSA-p293-qw3h-jr36. Both advisories identify 16.3.3 as patched. **Fixed:** `next` and `eslint-config-next` are pinned to 16.3.3; vulnerable transitive `sharp` was raised to 0.35.4.

### HIGH

1. **Chapter HTML/RSC requests had no application rate limit or behavioral detection.** A scraper could walk sequential routes at origin speed. **Fixed:** `proxy.ts` now protects canonical chapter routes before rendering, including direct RSC/navigation requests.
2. **Chapter content/access APIs had no read limiter.** Random or sequential direct API access could create database and Auth.js load. **Fixed:** an early one-minute burst guard runs before chapter lookup, followed by configurable Redis sliding-window risk evaluation once chapter metadata is known.
3. **No stable anonymous abuse-prevention identity existed.** IP-only control would either be bypassable or unfair to NAT/mobile users. **Fixed:** an opaque 30-day HttpOnly, Secure-in-production, SameSite=Lax cookie is combined with a hashed IP signal. A looser secondary IP window catches cookie rotation without making IP the primary identity.
4. **Current reader entitlement logic was split between purchase lookups, admin checks, and the API authorization service.** This did not expose paid body, but it created inconsistent membership behavior and increased regression risk. **Fixed:** the reader page and content API now use the same `canReadChapter` / `getAuthorizedChapterContent` boundary. Authorization completes before the body query.

### MEDIUM

1. **Anonymous paid API reads returned 403 and included the full access-decision object.** That leaked unnecessary internal entitlement details and did not distinguish authentication from authorization. **Fixed:** anonymous paid reads return 401, authenticated non-entitled reads return 403, and both return only `{"error":"CHAPTER_LOCKED"}`.
2. **Chapter UUID route parameters were passed to Drizzle without schema validation.** Invalid input could create avoidable database errors/work. **Fixed:** Zod UUID validation returns 400 before the query. Reader slug and chapter-number formats are also rejected before reader queries; chapter catalog APIs now validate slugs.
3. **There were no reader-focused security events or operational metrics.** **Fixed:** structured, redacted events and Redis counters/top-risk sets are emitted; `/api/admin/security/metrics` requires database-authoritative admin access and is `private, no-store`.
4. **Two separate paid-body helper functions bypassed the central content service.** Both were individually safe but enlarged the audit surface. **Fixed:** removed; one server-only content query remains behind the central decision.
5. **The crawler policy covered APIs/admin/studio but did not state an AI-training preference.** **Fixed:** private reader/account surfaces are disallowed and named training crawlers are asked not to crawl. This is explicitly treated as a preference, not a security boundary.

### LOW

1. **The CSP permits inline scripts and styles.** Other protections are sound (`frame-ancestors 'none'`, `object-src 'none'`, nosniff, strict referrer policy, permissions policy, HSTS in production). A nonce/hash migration was not applied because Next.js dynamic nonces change rendering/cache behavior and an untested CSP could break Google OAuth, Turnstile, Vercel tooling, or the reader. Track a nonce-based CSP as a separate browser-tested hardening change.
2. **Cosmetic copy protection (`select-none`) remains in the reader.** It is not counted as a security control and does not affect the server-side protection model.

## Chapter content flow after remediation

```text
request
  -> validate slug/chapter number or UUID
  -> resolve DB-backed user + opaque anonymous/session/IP signals
  -> burst/risk guard
  -> query chapter metadata only
  -> centralized published-state + purchase/membership/staff decision
       DENY -> 401/403 without body
       ALLOW -> query body from server-only module
  -> private/no-store response or authorized RSC render
```

The public snapshot is still a separate cache-safe metadata path. Its SQL projection replaces paid content with an editorial excerpt before Redis or `unstable_cache` sees the row. The client reader receives only the selected free, excerpt, or authorized content for that request.

## Rate and risk model

- Authenticated defaults: 30 chapter requests/5 minutes and 120/hour.
- Anonymous defaults: 15/5 minutes and 60/hour.
- Signals: abnormal frequency, sequential traversal, many novels, missing browser-navigation signals, and known automation markers.
- Frequency alone does not block a fast reader. LOW is allowed, MEDIUM is logged/observed, and HIGH receives 429 with `Retry-After` and no internal score.
- Redis uses a one-hour sorted-set sliding window. If Redis is disabled or unavailable, a bounded process-local fallback remains active. Entitlement remains PostgreSQL-authoritative and fails closed independently of Redis.

## Database review

No migration was required. Existing indexes already cover the hot authorization/navigation predicates:

- `novels_slug_uidx`
- chapter primary key plus `chapters_novel_number_uidx`
- `chapters_public_navigation_idx` and `chapters_published_navigation_idx`
- `chapter_unlocks` primary key `(user_id, chapter_id)` plus `chapter_unlocks_chapter_idx`
- `reader_memberships_entitlement_idx` on reader, writer, status, and period end

Queries are bounded (`limit(1)` for entitlement/body, maximum 100 chapter IDs for window unlock state). No attacker-controlled regex query or unbounded reader collection query was found.

## Environment changes

- `SECURITY_HASH_SECRET` (optional when `AUTH_SECRET` is configured; recommended so identifier hashing can rotate independently)
- `SECURITY_LOG_ENABLED=true`
- `CHAPTER_RATE_LIMIT_5M=30`
- `CHAPTER_RATE_LIMIT_1H=120`
- `CHAPTER_RATE_LIMIT_ANONYMOUS_5M=15`
- `CHAPTER_RATE_LIMIT_ANONYMOUS_1H=60`
- `SCRAPER_SEQUENTIAL_THRESHOLD=10`

No secret was copied from `.env`, and no secret is included in logs or client bundles.

## Verification

- Static checks: ESLint and TypeScript strict checks pass.
- Unit security tests cover paid-cache allowlisting, entitlement modes, fast-reader false positives, high-confidence sequential automation, sliding-window expiry, and anonymous-cookie attributes.
- Production dependency audit: 0 known vulnerabilities under `npm audit --omit=dev`.
- Four Moderate advisories remain in the local-only Drizzle Kit toolchain; npm's proposed remediation is a breaking downgrade and was intentionally not forced. Do not expose the development tool server publicly.
- The scraper harness is `npm run security:scraper-test -- <novel-slug>`. It refuses production-like hosts unless `SECURITY_TEST_ALLOW_PRODUCTION=true` is explicitly set.
- Production-build runtime smoke test: valid free content returned `200` with `Cache-Control: private, no-store, max-age=0` and an `HttpOnly` anonymous cookie; a malformed chapter identifier returned `400` with the same private/no-store policy.
- Local scraper run against the production build sent 100 sequential chapter requests: 19 returned `200`, then 81 returned `429` (10 ms average, 34 ms p95). Logs showed one stable hashed subject progressing from LOW to MEDIUM to HIGH without exposing the cookie or IP.
- The current database contains no published non-free chapter, so no production data was mutated merely to manufacture the paid-content sentinel test.

Database-backed anonymous/purchased/not-purchased HTML and RSC sentinel searches require a running environment with representative fixture accounts and are not asserted by unit tests alone. Run the post-deploy checklist below on localhost/staging before promotion.

## Post-deploy checklist

1. Seed a paid chapter with a unique sentinel sentence and three actors: anonymous, active non-purchaser, and purchaser/member.
2. Request normal HTML plus `RSC: 1` and prefetch-style requests for each actor; search raw HTML, Flight payload, JSON, and browser state for the sentinel.
3. Require zero matches for anonymous/non-purchaser and content availability for the entitled actor.
4. Confirm paid responses have `private, no-store`, never `public`/`s-maxage`, and that user B cannot receive user A's response through Vercel or Cloudflare.
5. Run the scraper harness and confirm 429 plus `Retry-After`, Redis window keys, structured events, and admin metrics.
6. Confirm normal sequential reading, Google login, unlock, refund, membership expiry, and admin preview still work.

## Remaining risks

- Any content rendered to an authorized browser, including free content and legitimately purchased content, can ultimately be copied. Controls increase bulk-automation cost; they cannot provide perfect DRM.
- Redis outage weakens multi-instance rate coordination to per-process limits, but never changes a paid entitlement decision to allow.
- Application scoring does not yet maintain an explicit concurrent-request gauge or feed 401/403 history back into the score; the burst limit, sequence model, and event metrics cover the immediate threat while those signals can be added after production baselining.
- Cloudflare/origin restrictions cannot be proven from this repository. Apply `CLOUDFLARE_SECURITY.md` and verify direct-origin bypass is closed before trusting `CF-Connecting-IP`.
- CSP inline allowances and four development-only audit advisories remain tracked hardening items.

## Risk score (10 = highest risk)

| Area | Before | After |
| --- | ---: | ---: |
| Premium Content Leakage | 3/10 | 1/10 |
| Mass Scraping Risk | 9/10 | 4/10 |
| Authorization Risk | 4/10 | 2/10 |
| Infrastructure Abuse Risk | 8/10 | 4/10 |

## Primary references

- [Next.js AVIF image optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)
- [Next.js Windows-hosted server advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
- Local version-matched Next.js documentation under `node_modules/next/dist/docs/`, especially data security, Cache Components, Route Handlers, Proxy, and the v16 upgrade guide.
