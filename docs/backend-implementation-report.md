# NovelNow Backend Implementation Report

Date: 2026-08-22

## 1. Existing architecture found

- Next.js 16 App Router modular monolith
- PostgreSQL with Drizzle ORM
- Auth.js with PostgreSQL adapter
- Redis cache/rate limiting and Cloudflare R2-compatible object storage
- Existing reader library, reading progress, story follow, coin wallet, immutable coin ledger, chapter unlock, search projection, and admin CRUD

## 2. Existing modules reused

- `users`, `novels`, `chapters`, `genres`, `novel_genres`
- `reading_progress`, `reading_history`, `user_library`, `novel_follows`
- `coin_wallets`, `coin_ledger_entries`, `chapter_unlocks`
- Existing Auth.js DAL, user/admin API wrappers, CSRF checks, rate limiting, cache invalidation, upload validation, and PostgreSQL search

## 3. Schema changed

- Added writer profiles without splitting Reader and Writer accounts
- Added normalized relationship, setting, trope, and content-warning masters and story/chapter relations
- Added story ownership, origin/rights, heat, story type, and policy confirmations
- Added four chapter access modes, early-access release policy, heat/warning overrides, and optimistic versioning
- Added paid/bonus/promo coin attribution and stored paid-coin monetary value
- Added writer follows, writer posts, membership plans/states, notifications, privacy settings, content reports
- Added creator contracts, immutable revenue events, and creator ledger entries using integer minor units and basis points

## 4. Migration performed

- Fresh Drizzle baseline and corrective migrations generated under `drizzle/`
- `pg_trgm` enabled by the baseline migration
- Migrations applied successfully to the configured database
- Frozen taxonomy seeded idempotently: 8 genres, 5 relationships, 14 settings, 30 tropes, 14 content warnings
- Migration graph passes `drizzle-kit check`

## 5. APIs implemented

- Studio writer profile, story CRUD/lifecycle, chapter CRUD/autosave/publish/schedule/unpublish
- Chapter access/content/unlock with server-side content protection
- Studio membership plan, posts, earnings, revenue share, fans
- Reader coins, library views, writer follows, memberships, notifications, privacy
- Public home, discover, search, taxonomy, story, chapter metadata, writer profile/posts, membership plan
- Coin top-up and membership billing boundaries fail closed until approved providers are configured
- Admin revenue-contract creation and content reports

## 6. Out-of-scope modules untouched

Hidden legacy Studio routes and existing admin/catalogue modules were not deleted or connected to new product flows. No community, chat, forum, affiliate, ads, creator teams, gamification, missions, marketplace, advanced CRM, or ML recommendation domain was added.

## 7. Known technical debt

- Studio UI still contains mock/in-memory state and is not fully wired to these APIs
- Scheduled publishing and outbox processing are idempotent commands, but deployment still needs cron/worker invocations
- Fan taxonomy preferences query the operational database directly; a summary table may be needed at larger scale
- Featured-story ownership is service-validated rather than enforced by a circular database foreign key
- Several PostgreSQL auto-generated FK names are truncated to 63 characters; behavior is correct but naming can be cleaned up

## 8. Production risks

- No approved coin top-up or membership billing provider is configured
- Transactional outbox is implemented, but no continuously running production worker/queue deployment is configured
- Authenticated HTTP session E2E still requires a browser/session harness; ownership and concurrency are covered at the service/database boundary
- Existing `.env` uses a non-production public URL; production builds require a credential-free HTTPS `NEXT_PUBLIC_APP_URL`
- Revenue attribution depends on trusted top-up adapters supplying paid monetary value and currency to `creditCoins`

## 9. Missing provider/configuration

- Approved `CoinTopupProvider` implementation and signed webhook route
- Approved `MembershipBillingProvider` implementation and signed webhook route
- Production scheduler invoking `npm run db:publish-scheduled`
- Production worker invoking `npm run db:process-outbox`
- Production HTTPS app URL and provider credentials

## 10. Test results for core scenarios

- TypeScript: passed
- Vitest: 36 files, 187 tests passed
- Chapter access policy: free, purchased, paid-required, early-access member/non-member/public release, members-only, unpublished
- Membership period boundary: active and cancel-at-period-end behavior passed
- Creator revenue allocation/split: stored monetary value and basis-point snapshot calculations passed
- Drizzle migration graph: passed
- Migration and master seed against configured PostgreSQL: passed
- Scheduled publisher runtime smoke: passed, zero due chapters
- Disposable real-database core verification: passed and cleaned up fixtures
	- Two concurrent unlock requests produced one debit, one purchase, and one revenue event
	- Balance moved from 12 to 9 exactly once
	- Purchased access returned `PURCHASED`
	- Insufficient balance remained unchanged and created no purchase
	- 85% contract snapshot produced 255 minor units of creator revenue
	- Refund restored the exact coin buckets/value, revoked access, and created one immutable negative revenue/creator-ledger reversal
	- Writer B was denied access to Writer A's story at the ownership service boundary
	- Scheduled chapter remained private before its timestamp and transitioned exactly once afterward
	- Transactional outbox delivered privacy-aware notifications once, including retry deduplication
	- Active and cancel-at-period-end membership access remained valid until the exclusive period-end boundary
	- Studio story taxonomy creation and free chapter publish/access passed
- Next.js production build: passed with a temporary HTTPS public URL override

Not yet proven by automated end-to-end tests: authenticated browser/session HTTP calls and real approved payment-provider checkout/webhook flows. Provider-state membership events are tested, but billing itself remains an external acceptance blocker rather than being reported as passed.
