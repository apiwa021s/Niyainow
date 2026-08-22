# Operations and deployment

## ลำดับ deploy

1. สร้าง PostgreSQL database/role แบบ least privilege, บังคับ provider TLS และตรวจว่า migration role เปิด `pg_trgm` ได้
2. ตั้ง environment variables จาก `.env.example` ใน secret manager ของ platform
3. รัน `npm ci` และ `npm run verify`
4. รัน `npm run db:migrate` ด้วย release job เพียงชุดเดียวก่อนสลับ traffic
5. Deploy application; seed ใช้เฉพาะ disposable development/staging และต้อง opt in ด้วย `ALLOW_DEVELOPMENT_SEED=true`
6. Smoke test anonymous, Google user และ admin ตาม `production-checklist.md`

### Vercel

`package.json` defines `vercel-build` as `npm run db:deploy && next build`. Vercel
uses this automatically when the project Build Command is left at the framework
default. `db:deploy` applies committed migrations, seeds idempotent product
master data, and verifies every Auth.js table/column before the application
artifact is produced.

The Preview and Production environments must each point `DATABASE_URL` at their
intended database. A deployment must fail during build if migration access is
missing; do not deploy an artifact and defer migration until the first OAuth
request.

To diagnose Auth.js `Failed query` errors without printing credentials:

```powershell
npm.cmd run db:check-auth
```

An out-of-date schema reports exact names such as
`users.age_gate_accepted_at`. A connection/permission problem remains a database
error and should be fixed at the provider or role level rather than bypassed in
the Auth.js adapter.

ห้ามใช้ `drizzle-kit push` กับ production; schema เปลี่ยนผ่าน migration ที่ review และ commit เท่านั้น

`NEXT_PUBLIC_APP_URL` และ `NEXT_PUBLIC_ASSET_URL` เป็น build-time contract ทั้งคู่ ต้องเป็น HTTPS URL ของ production ก่อนรัน `npm run build`; การ inject หลังสร้าง artifact จะสายเกินไป Production build ตั้งใจ fail หากขาดหรือเป็น URL ที่ไม่ปลอดภัย CI ใช้โดเมน `.invalid` เพื่อ compile/check เท่านั้นและไม่ควรนำ artifact ของ CI ไป deploy

## Google OAuth

- สร้าง OAuth Web Client ใน Google Cloud
- Authorized origin: ค่า `NEXT_PUBLIC_APP_URL`
- Redirect URI: `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
- เก็บ client secret ใน secret manager และ rotate เมื่อสงสัยว่ารั่ว
- Provision `EDITOR/ADMIN` ผ่าน database-controlled process เท่านั้น

## Cloudflare R2

### Staged upload protocol (authoritative)

- The presigned browser `PUT` targets only `staging/{final-object-key}`. The
  publicly served `covers/`, `banners/`, and `avatars/` prefixes never receive
  unverified browser uploads.
- Completion performs `HEAD`, a bounded `GET bytes=0-63`, and JPEG/PNG/WebP/AVIF
  magic-byte validation. Both the ranged read and the same-bucket promotion use
  the ETag observed by `HEAD` (`If-Match` / `CopySourceIfMatch`) so a replaced
  staging object cannot win a verify-to-copy race.
- After validation, the server copies the object to its final allowlisted key,
  verifies the promoted metadata, deletes the staging object, and only then marks
  the media row `READY`. A failed validation is marked `FAILED` and the staging
  object is deleted when possible.
- Completion atomically claims `PENDING -> VERIFYING`; only that claim may finish
  `VERIFYING -> READY`. Cleanup reclaims a `VERIFYING` row only after the stale
  cutoff, preventing completion and expiry from deleting/promoting the same upload.
- Disable the bucket's public `r2.dev` endpoint. The custom CDN domain or Worker
  used by `NEXT_PUBLIC_ASSET_URL` **must return 403 with no cache for
  `/staging/*`**, and there must be no alternate public origin that bypasses this
  rule. The staging prefix and final prefixes intentionally share a private bucket.
- Serve final media from a dedicated cookie-less origin distinct from the app
  origin. Preserve the verified object `Content-Type` and add
  `X-Content-Type-Options: nosniff` on every final media response; the signature
  check is a bounded format gate, not a full image decoder.
- Upload presign and completion are independently rate-limited by admin ID and
  scope. The current limiter is process-local; use a shared KV/Redis-backed
  implementation before deploying multiple write instances.
- Configure the bucket CORS policy from `docs/cloudflare-r2-cors.json` in
  Cloudflare R2 Settings so browser presigned `PUT` uploads from the production
  app origin can pass preflight. Add each Vercel preview origin explicitly when
  testing uploads from preview deployments; do not add a trailing slash to any
  origin.

### Media lifecycle cleanup

Run a dry-run before enabling deletion:

```powershell
npx.cmd tsx db/cleanup-media.ts --older-than-hours=24 --delete-limit=200 --orphan-scan-limit=1000
```

The committed `.github/workflows/media-cleanup.yml` invokes this command hourly
against the protected GitHub `production` environment (never from a request
handler):

```powershell
npx.cmd tsx db/cleanup-media.ts --execute --older-than-hours=24 --delete-limit=200 --orphan-scan-limit=1000
```

The bounded job expires stale `PENDING`/`VERIFYING`/`FAILED`/`ORPHANED` rows, deletes leftover
staging objects, removes untracked managed keys after the grace period, and stores
its R2 scan cursor in the private `site_settings` key
`jobs.media_cleanup.cursor`. Alert on a non-zero failed-delete count.

Cleanup transitions a claimed database row to `ORPHANED` before deleting R2. READY
reconciliation locks candidate media rows, rechecks every supported reference,
and makes the same transition in one transaction. Novel attachment takes the
matching media-row lock in its mutation transaction; this prevents a new live
reference from racing object deletion. Failed R2 deletes remain `ORPHANED` and are
retried without relying on the current object state.

Novel replacement/deletion mutations lock the involved media rows and mark
detached cover/banner objects `ORPHANED` directly. The workflow still runs this
conservative weekly repair for abandoned `READY` rows; it considers only old rows
and rechecks every current structured reference before deletion:

```powershell
npx.cmd tsx db/cleanup-media.ts --execute --reconcile-unattached-ready --ready-grace-hours=168 --delete-limit=200
```

Inference-based READY reconciliation is intentionally limited to `COVER`,
`BANNER`, and `AVATAR`, whose references are normalized and lock-coordinated.
`NOVEL_ASSET` and `OG` must be marked `ORPHANED` explicitly by their owning
mutation because they may appear in free-form content/settings.

Configure `DATABASE_URL` and the five `R2_*` credentials as secrets on the
protected GitHub `production` environment. The workflow also supports a manual
dry-run and a separately confirmed manual execute/reconciliation. If deployment
uses another scheduler, mirror these exact invocations and disable the GitHub
schedule so only one scheduler owns the lifecycle job.

- สร้าง private bucket และ API token ที่จำกัด bucket
- ผูก custom public CDN domain สำหรับ asset ที่ `READY`
- ตั้ง bucket CORS ให้ production origin ทำ `PUT` ด้วย MIME ที่อนุญาตและอ่าน response header ที่จำเป็น
- Browser upload ได้เฉพาะ staging key; server ใช้ staged protocol ด้านบนเพื่อตรวจ bytes และ promote ก่อนบันทึก asset เป็น `READY`
- อย่าเก็บ URL หรือ presigned URL ใน DB; เก็บ object key เท่านั้น

## Database

- ใช้ pooled connection string ของ provider สำหรับ application และแยก direct migration URL เมื่อ provider กำหนด
- บังคับ TLS (`sslmode=require` หรือ `verify-full` ตาม provider), ใช้ application role แบบ least privilege และแยก migration role
- เปิด automated backup + point-in-time recovery และทดสอบ restore เป็นรอบ
- Monitor connection saturation, slow query, lock wait, migration duration และ replica lag (ถ้ามี)
- รัน `ANALYZE` ตาม provider policy หลัง import ข้อมูลก้อนใหญ่
- Engagement write ปรับ counter ด้วย delta ภายใต้ lock ต่อ novel; เปิด `.github/workflows/reconcile-engagement.yml` เพื่อรัน bounded reconciliation รายวันและ alert เมื่อ job ล้มเหลว

Dry-run และ execute แบบจำกัด batch:

```powershell
npm.cmd run db:reconcile-engagement -- --limit=200
npm.cmd run db:reconcile-engagement -- --execute --limit=200
```

Job เก็บ keyset cursor ใน private `site_settings`; ให้ scheduler เดียวเป็น owner และอย่ารัน `--execute` ซ้อนกันนอก workflow ที่มี concurrency guard

## Logs และ monitoring

`lib/logger.ts` ให้ structured JSON log และ redact key ที่เป็น secret/token/password โดยค่า `LOG_LEVEL` คุมระดับ Production ควรส่ง stdout ไป log platform และติดตั้ง error/APM provider ที่ deployment ใช้ โดยไม่ใส่ PII หรือ chapter body ใน event

Alert ขั้นต่ำ:

- 5xx/error rate และ latency ของ public reader/search
- OAuth callback failure
- database connection/transaction failure
- R2 presign/verification failure
- admin write failure และ migration failure

## Cache/jobs/rate limit

Public cache ใช้ framework cache พร้อม tags; personal/admin ไม่ cache Rate limit และ view dedupe ปัจจุบันเป็น bounded process-local protection และ service boundary พร้อมเปลี่ยนเป็น Redis/provider limiter/counter buffer ก่อน scale หลาย write instances งานหนักในอนาคต (rank snapshot และ image processing) ควรไปรันใน queue/cron ไม่ทำใน reader request Scheduled publish ถูกปิดจนกว่าจะมี durable scheduler

## Trusted edge boundary

- วางแอปหลัง trusted proxy/WAF ที่ลบ header จาก client แล้วเขียน `X-Forwarded-For`/`X-Real-IP` ใหม่จาก peer จริงเท่านั้น; ห้ามส่ง header ที่ client กำหนดเองต่อเข้าแอป
- บังคับ distributed rate limit ที่ edge โดยเฉพาะ auth, search suggestion, view event และ admin upload เพราะ limiter ใน process ไม่ใช่ volumetric DDoS boundary
- จำกัด request body ที่ edge: JSON ทั่วไปเพียงไม่กี่ KB และอนุญาตประมาณ 5 MB เฉพาะ admin chapter mutation เพื่อครอบคลุมเพดาน UTF-8 4 MB พร้อม JSON overhead; browser upload binary ไป R2 โดยตรง
- ตั้ง timeout/request logging โดยไม่บันทึก OAuth token, presigned URL, PII หรือ chapter body

## Rollback

- Application: rollback artifact ได้เมื่อ migration ยัง backward compatible
- Database: ใช้ forward-fix migration เป็นหลัก; backup restore เป็นเหตุฉุกเฉิน
- Content: published novel/chapter ใช้ archive/soft delete ไม่ hard-delete โดย default
- Media: mark orphan แล้ว cleanup แบบ delayed; ห้ามลบ object ที่ยังถูก reference
