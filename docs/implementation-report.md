# Engineering implementation report

## 1. Architecture

ระบบเป็น Next.js modular monolith: Server Components สำหรับ public content, route handlers สำหรับ mutation, PostgreSQL/Drizzle เป็น source of truth, Auth.js Google-only และ Cloudflare R2 สำหรับ media binary รายละเอียดอยู่ใน `docs/architecture.md`

## 2. Pages audited

Route inventory, auth/cache/SEO และสถานะ production อยู่ใน `docs/route-audit.md` Mock flows เดิมถูกแทนด้วย DAL จริงหรือปิดอย่างชัดเจนเมื่อไม่มี backend ที่ปลอดภัย

## 3. Database

Schema แบ่ง identity, normalized content, engagement, analytics/rankings และ operations รวม 28 tables Chapter text อยู่ PostgreSQL `TEXT`; R2 records เก็บ object key รายละเอียด relationship/constraint อยู่ใน `db/README.md`

## 4. Indexes

Hot paths มี compound/partial indexes สำหรับ published novel latest/status/featured, chapter navigation, reverse taxonomy joins, user library/history, public reviews, daily stats/ranking และ trigram search projection Migration ที่ generate แล้วอยู่ใน `drizzle/`

Global admin chapter catalogue มี partial index `(updated_at DESC, id DESC) WHERE deleted_at IS NULL` สำหรับ bounded pagination ที่ระดับ 500k+ chapters

## 5. Authentication

Auth.js เปิด Google OAuth provider เท่านั้น User ใหม่เป็น `READER`; JWT ใช้กับ Proxy guard แต่ server mutations ตรวจ user role/status ล่าสุดใน PostgreSQL Password/register/reset/OTP เดิมถูกลบหรือ redirect

## 6. R2

Uploads now use a private staging-to-public promotion boundary. The browser can
write only `staging/{final-key}`; completion validates size/metadata plus image
magic bytes using a bounded ranged read, pins verification and copy to the same
ETag, promotes to an allowlisted final key, and removes staging before `READY`.
Presigned PUTs disable optional empty-body SDK checksums so browser bodies do not
fail against a checksum calculated for an empty payload. Cleanup is a bounded,
cursor-backed command with dry-run, hourly stale/orphan cleanup, and an explicit
weekly unattached-`READY` reconciliation mode. The production CDN must deny
`/staging/*` and the bucket must not expose an alternate public origin.

The media lifecycle uses a conditional `PENDING -> VERIFYING -> READY` claim.
Cleanup claims rows as `ORPHANED` before storage deletion; READY reconciliation
locks/rechecks all supported references in the same transaction, while novel
attachment takes the matching media lock. Failed object deletions remain
`ORPHANED` for an idempotent retry.

## 7. Caching

Public finite datasets ใช้ tagged cache ตาม TTL ส่วน free-text, personalized set และ dynamic negative lookup ไม่สร้าง persistent cache key; request-local React cache ลด query ซ้ำระหว่าง metadata/page User/admin ไม่ cache และ admin content write invalidate tagged data หลัง transaction ดูตารางใน `docs/architecture.md`

Library/follow/rating/review aggregates ใช้ constant-time delta ใน transaction แทน full recount บน request path และมี bounded nightly reconciliation พร้อม dry-run/cursor เพื่อซ่อม drift โดยไม่สแกนทั้งฐานข้อมูลในครั้งเดียว

## 8. SEO

มี centralized site config, metadata/canonical/OG/Twitter, generated default OG image, robots, scalable sitemap และ WebSite/Book/Article/Breadcrumb JSON-LD Primary novel/chapter text crawl ได้จาก server HTML

## 9. Security

Admin upload presign and completion have separate, actor-scoped bounded rate
limits. Image acceptance uses bytes, not a client or `HEAD` MIME claim, and
ETag preconditions close the verification-to-promotion replacement race.

มี DB-fresh authorization, same-origin mutation checks, Zod validation, bounded rate limit, safe redirect, structured redacting logs, CSP/HSTS/security headers, R2 object-key validation และ soft-delete/publication filters Paid body ไม่ถูก serialize ไป browser

## 10. Remaining external setup

ต้องใช้ค่าจากเจ้าของระบบเท่านั้น: production domain, PostgreSQL URL/migration application, Google OAuth ID/secret, Auth secret, R2 credentials/bucket/custom domain/CORS, initial admin provisioning และ monitoring provider ไม่มี credential ใดถูกสร้างแทนหรือ commit

## 11. Production checklist

ใช้ `docs/production-checklist.md` เป็น release gate และบันทึกผล smoke test จริงหลังตั้ง external services แล้ว

Local release verification วันที่ 2026-08-14 ผ่าน clean `npm ci`, ESLint, TypeScript, Vitest 22 files / 82 tests, Drizzle migration integrity และ Next.js 16.3.0 production build. Production dependency audit พบ 0 vulnerability; migration/seed/provider smoke tests ยังต้องรันกับ external services จริงตาม checklist โดยไม่มีการสร้าง credential ปลอม
