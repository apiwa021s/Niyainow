# Route and capability audit

ตรวจครั้งแรกจาก commit `1d24440` ก่อนแก้ไฟล์ใด ๆ: ทุก route ใช้ข้อมูล mock, ฟอร์ม authentication เป็น email/password/OTP จำลอง, `/admin` ไม่มี authorization guard และ state ผู้ใช้อยู่ใน `localStorage` จากนั้น public/reader product ถูกออกแบบโครงสร้าง UX/UI ใหม่เป็นระบบ NiyaiThai Akane editorial ขณะที่ data/security boundary ถูกย้ายสู่ production ตามตารางด้านล่าง

## Public pages

| Route | Rendering and data | Cache/SEO | Status |
| --- | --- | --- | --- |
| `/` | Server Component; published catalog, updates, rankings, taxonomy และ personalization สำหรับ active user | Dynamic shell + tagged DAL cache; WebSite JSON-LD | Production-backed |
| `/novels` | URL-driven page, filter, genre, sort และ pagination จาก PostgreSQL | Canonical metadata; bounded cached query | Production-backed |
| `/search` | PostgreSQL search projection ครอบคลุมชื่อหลัก/ชื่อรอง/ผู้เขียน/ผู้แปล/แนว/แท็ก พร้อม weighted relevance | Query canonicalization; no client catalog download | Production-backed |
| `/genre/[slug]`, `/tag/[slug]` | Published novels เท่านั้น พร้อม editorial shelves, facet และ pagination; genre rising มาจาก engagement จริง 7 วัน | Canonical metadata; unknown slug เป็น 404 | Production-backed |
| `/genres`, `/tags` | Active taxonomy และจำนวน public usage จาก published novels | Indexable canonical pages | Production-backed |
| `/updates` | Published chapters; filter genre ทำใน SQL ก่อน `LIMIT` ส่วนอัปเดตเฉพาะเรื่องที่ติดตามอยู่บนหน้าแรกของผู้ใช้ที่ลงชื่อเข้าใช้ | URL state + short tagged cache | Production-backed |
| `/rankings` | Daily aggregate/novel statistics ตามช่วงเวลา | Tagged cache; ไม่มีคะแนนจำลอง | Production-backed; ต้องมี traffic จริงเพื่อสะสมสถิติ |
| `/novel/[slug]` | รายละเอียด normalized author/genre/tag, ตอนล่าสุด, published reviews และ user actions | Book + Breadcrumb JSON-LD, canonical/OG | Production-backed |
| `/novel/[slug]/chapters` | Published chapter catalogue เรียง `sort_order`, รองรับเลขตอนทศนิยมและ pagination | Canonical; draft/deleted/future เป็น 404/ไม่ปรากฏ | Production-backed |
| `/novel/[slug]/chapter/[chapter]` | Publication state ตรวจตรงจาก DB ทุก request; free body อยู่ใน Server Component เท่านั้น, paid ส่งได้เฉพาะ excerpt จำกัดขนาด | Article JSON-LD; metadata ตรวจ chapter จริง; access boundary ไม่ใช้ shared cache | Production-backed |
| `/about`, `/terms`, `/privacy` | Static service copy | Indexable metadata | Production-backed; legal copy ต้องให้เจ้าของอนุมัติ |
| `/login` | Google OAuth เท่านั้น | `noindex` | Production-backed |
| `/register`, `/forgot-password` | Redirect ไป `/login`; ไม่มี password database หรือ reset flow | `noindex` ผ่านปลายทาง | Intentionally removed (Google-only) |

Public shell ใช้ optimized `next/image`, production domain จาก `NEXT_PUBLIC_APP_URL`, `robots.txt`, social preview 1200×630 ของ NiyaiThai และ sitemap index แบบแบ่ง partition ที่ `/sitemap.xml`  `/sitemaps/[partition].xml`

## Authenticated reader pages

ทุก route ในกลุ่มนี้ตรวจ active user จาก PostgreSQL ฝั่ง server, เป็น dynamic/private และ `noindex` ข้อมูลไม่ใช้ browser storage เป็น source of truth

| Route | Backing capability | Status |
| --- | --- | --- |
| `/library`, `/library/reading`, `/library/bookmarks`, `/library/completed` | Unique user/novel library row พร้อมสถานะ filter และ server pagination | Production-backed |
| `/history` | Compact user/novel history, last chapter/time, read count และ server pagination | Production-backed |
| `/profile` | Google identity + database engagement summary | Production-backed |
| `/settings` | Google identity แบบ read-only; display/reader preferences ที่ไม่ใช่ authority เก็บ local ได้ | Production-backed within stated scope |
| `/notifications` | แสดง follow state จริง | Delivery worker intentionally unavailable และแจ้งตรงไปตรงมา |
| `/wallet` | Protected route ไม่มียอดเหรียญปลอม | Payments/commerce intentionally unavailable |

## Admin pages

`proxy.ts` ทำ optimistic route gate และ `app/admin/(panel)/layout.tsx` เรียก DB-fresh `requireAdmin()` ทุกครั้ง ทุก API admin ตรวจ role/status ซ้ำ, ตรวจ same-origin, validate payload และเขียน audit log

| Route | Capability | Status |
| --- | --- | --- |
| `/admin/login` | Google OAuth สำหรับบัญชีที่ DB กำหนด role เป็น `EDITOR`/`ADMIN` | Production-backed |
| `/admin` | Dashboard จาก novel/chapter/publication/audit aggregates | Production-backed |
| `/admin/novels`, `/admin/novels/new`, `/admin/novels/[slug]` | List/search/create/edit/soft-delete novel, normalized author/genre/tag, stable unique slug, R2 cover/backdrop | Production-backed |
| `/admin/chapters`, `/admin/novels/[slug]/chapters` | Bounded global/per-novel catalogue | Production-backed |
| `/admin/novels/[slug]/chapters/new`, `/admin/novels/[slug]/chapters/[chapter]` | Create/edit/delete/publish/unpublish; decimal chapter number + explicit sort order; publish transaction updates denormalized latest/count/search/audit/cache | Production-backed; paid publishing disabled while commerce is unavailable |
| `/admin/novels/[slug]/chapters/[chapter]/preview` | Admin-only server rendering of draft content | Production-backed; never creates a public chapter URL |
| `/admin/genres` | Create/edit/activate/deactivate genre พร้อม stable unique slug, usage count, audit และ cache invalidation | Production-backed |
| `/admin/tags` | DB tag inventory; tags may be created through novel form transaction | Production-backed read view |
| `/admin/comments` | คิว moderation รีวิวแบบ bounded; publish/reject/hide พร้อมตรวจ revision, note, aggregate, audit และ cache invalidation | Production-backed |
| `/admin/activity` | Latest bounded `admin_audit_logs`, read-only | Production-backed |
| `/admin/analytics`, `/admin/announcements`, `/admin/banners`, `/admin/coins`, `/admin/payouts`, `/admin/reports`, `/admin/settings`, `/admin/staff`, `/admin/submissions`, `/admin/transactions`, `/admin/users`, `/admin/users/[id]` | Guarded unavailable page; hidden from navigation | Intentionally disabled—no fake data or fake success |

Scheduled publication is intentionally rejected until a durable scheduler exists; publish/unpublish remains an explicit admin transaction.

## Route handlers

| Endpoint | Methods | Authorization and behavior |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | Auth.js GET/POST | Google provider only; secure session cookies/JWT callbacks + DB adapter |
| `/api/search/suggest` | GET | Anonymous, input bounded and rate-limited; published projection only |
| `/api/events/view` | POST | Anonymous bounded view event; same-site validation, rate limit and dedupe; updates aggregate/daily counters without collecting identity |
| `/api/me/state` | GET | Active user; lazy per-novel initial action state, private `no-store` |
| `/api/me/library` | GET/PUT/DELETE | Active user; one row per user/novel |
| `/api/me/follows` | GET/PUT/DELETE | Active user; idempotent follow state |
| `/api/me/progress` | GET/PUT | Active user; free published chapters only, throttled and transaction-serialized per user/novel |
| `/api/me/rating` | GET/PUT/DELETE | Active user; one rating per user/novel + locked aggregate update |
| `/api/me/reviews` | GET/PUT/DELETE | Active user; moderation state, soft delete |
| `/api/admin/novels` | POST | Current admin/editor; validated transactional create |
| `/api/admin/novels/[slug]` | PATCH/DELETE | Current admin/editor; validated update/soft delete + audit + immediate cache invalidation |
| `/api/admin/genres` | POST | Current admin; validated create with stable unique slug + audit/cache invalidation |
| `/api/admin/genres/[id]` | PATCH | Current admin; edit/activate/deactivate with row lock + audit/cache invalidation |
| `/api/admin/chapters` | POST | Current admin/editor; validated create and aggregate synchronization |
| `/api/admin/chapters/[id]` | PATCH/DELETE | Current admin/editor; publish/update/delete transaction + content-safe audit snapshot |
| `/api/admin/reviews/[id]` | PATCH | Current admin/editor; revision-bound publish/reject/hide transaction + content-safe audit and immediate public cache expiry |
| `/api/admin/uploads/presign` | POST | Current admin/editor; scoped rate limit; allowlisted prefix/MIME/extension/size; signed PUT targets private `staging/` only and returns the planned final `objectKey` |
| `/api/admin/uploads/complete` | POST | Current admin/editor; scoped rate limit; conditional `PENDING -> VERIFYING -> READY`; ETag-bound `HEAD` + ranged magic-byte verification; same-bucket promotion; staging deletion before `READY` |
| `/sitemap.xml`, `/sitemaps/[partition].xml` | GET | Dynamic XML; public rows only, 10,000 content URLs per partition เพื่ออยู่ใต้ response limit ของ serverless |

Mutation handlers return structured errors, private/no-store headers where applicable, same-origin protection, bounded in-process rate limiting and redacted structured logs. For horizontally scaled production, move the rate-limit/dedupe state to a shared edge/KV service without changing the route contracts.

## Audit disposition

- Mock modules are retained only as deterministic development seed input; runtime code does not import them.
- Password, registration, OTP, fake wallet, fake notifications and fake admin write success were removed.
- Unsupported business modules remain guarded and explicit so deep links do not imply that data exists.
- External credentials and provider resources were not fabricated. See `docs/operations.md` and `docs/production-checklist.md` for the deployment boundary.
