# Production checklist

เอกสารนี้แยก “พร้อมใน repository” ออกจาก “ต้องตั้งค่าในระบบภายนอก” อย่างชัดเจน การที่ build ผ่านไม่ได้แปลว่า production runtime เชื่อมต่อ provider แล้ว

## Repository quality gate

- [x] `npm ci` (local release verification 2026-08-14)
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` — 22 files / 82 tests
- [x] `npm run db:check`
- [x] `npm run build` — Next.js 16.3.0 production artifact with required HTTPS public build variables
- [x] ตรวจ `git diff --check` และไม่มี secret/`.env`/generated local state
- [ ] CI ผ่านบน commit ที่ deploy

`npm audit --omit=dev` พบ 0 vulnerability. Full audit พบ 4 moderate เฉพาะ dev-only chain ภายใต้ `drizzle-kit`; คำแนะนำอัตโนมัติจะ downgrade เป็น breaking version จึงไม่ใช้ `npm audit fix --force` และไม่กระทบ production dependency graph

## External setup (owner/platform)

- [ ] Disable the public R2 `r2.dev` endpoint and confirm no alternate bucket
      origin can bypass the custom CDN/Worker.
- [ ] Configure the custom CDN/Worker to return uncached `403` for `/staging/*`;
      verify a known staging key is blocked while a final `covers/` key is served.
- [ ] Use a cookie-less asset origin distinct from the app origin; verify final
      responses preserve their authorized image `Content-Type` and include
      `X-Content-Type-Options: nosniff`.
- [ ] Add database/R2 secrets to the protected GitHub `production` environment,
      enable `.github/workflows/media-cleanup.yml`, inspect a manual dry-run, and
      alert on failures. It runs hourly cleanup and weekly conservative
      `--reconcile-unattached-ready` repair; novel replacement/deletion already
      marks detached cover/banner assets `ORPHANED` directly.
- [ ] Enable `.github/workflows/reconcile-engagement.yml` in the protected
      production environment, inspect a manual dry-run, and alert on the bounded
      nightly reconciliation job.

- [ ] ตั้ง production domain และ `NEXT_PUBLIC_APP_URL` เป็น HTTPS ก่อน build
- [ ] ตั้ง `NEXT_PUBLIC_ASSET_URL` เป็น HTTPS custom CDN domain ก่อน build และยืนยันว่า image host ถูกฝังใน artifact
- [ ] สร้าง PostgreSQL ด้วย least-privilege app role, pooled TLS URL, แยก migration role, เปิด backup/PITR และทดสอบ restore
- [ ] Apply committed migration ด้วย release job
- [ ] สร้าง Google OAuth Web Client + production callback URI
- [ ] สร้าง `AUTH_SECRET` ที่แข็งแรงและตั้ง Google credentials
- [ ] สร้าง R2 bucket/token/custom domain/CORS แล้วตั้งตัวแปร R2
- [ ] Provision บัญชี `ADMIN` จาก DB-controlled process
- [ ] ต่อ stdout/error logs เข้าระบบ monitoring และตั้ง alert
- [ ] ตั้ง trusted proxy/WAF ให้ strip/overwrite client IP headers, จำกัด body/rate ที่ edge และทดสอบว่า spoof header ไม่ bypass limiter
- [ ] ตรวจ/อนุมัติข้อความ Terms/Privacy โดยเจ้าของบริการก่อนเปิดสาธารณะ

## Anonymous smoke test

- [ ] Home แสดง empty state หรือข้อมูลจริงโดยไม่ใช้ mock fallback
- [ ] Browse filter/sort/page อยู่ใน URL และ refresh แล้วยังเหมือนเดิม
- [ ] Search title/original/alternative title/author/tag และ suggestion debounce
- [ ] Genre/tag/update/ranking ใช้ published data เท่านั้น
- [ ] Unknown novel/chapter และ draft/unpublished chapter ได้ 404
- [ ] Reader previous/next ใช้ sort order และเนื้อหาอยู่ใน server-rendered HTML
- [ ] Locked chapter response ไม่มี full body

## Google user smoke test

- [ ] Login/Logout ด้วย Google เท่านั้น
- [ ] Library add/remove/status ไม่สร้าง row ซ้ำ
- [ ] Follow, continue reading, progress และ history ซิงก์หลังเปิดอุปกรณ์ใหม่
- [ ] Progress ไม่เขียนทุก scroll event
- [ ] Rating หนึ่งค่าต่อ user/novel และ aggregate ถูกต้อง
- [ ] Review แสดงสถานะ moderation ที่ตรงจริง
- [ ] Suspended/banned user ทำ protected mutation ไม่ได้

## Admin smoke test

- [ ] Confirm presign returns a URL under `staging/`, not `covers/`, `banners/`,
      or `avatars/`, while the response `objectKey` remains the planned final key.
- [ ] Upload a valid image, complete it, and confirm only the promoted final key
      is public and the staging key is gone.
- [ ] Upload content whose bytes do not match its declared image MIME and confirm
      completion fails, the media never becomes `READY`, and the staging object is
      deleted or is removed by the cleanup job.
- [ ] Replace the staging object between verification steps and confirm the ETag
      precondition prevents promotion.
- [ ] Confirm repeated presign/complete calls reach actor-scoped `429` limits.

- [ ] Anonymous/READER เข้า admin และ API admin ไม่ได้
- [ ] Create/edit novel พร้อม author/genre/tag และ stable unique slug
- [ ] Create/edit/activate/deactivate genre บนฐานข้อมูลใหม่โดยไม่ใช้ development seed
- [ ] Presign ปฏิเสธ MIME/size/extension/role ที่ไม่ถูกต้อง
- [ ] Create/edit draft chapter รองรับเลขทศนิยมและ sort order
- [ ] Preview draft ไม่เปิด URL public
- [ ] Publish/unpublish ทำ transaction และ update latest/count/audit/cache
- [ ] Review moderation ปฏิเสธ revision เก่าและ publish/reject/hide แล้ว update count/audit/cache ถูกต้อง
- [ ] โมดูลที่ยังไม่มี backend ถูกซ่อนหรือแสดง unavailable โดยไม่มี fake success

## SEO/performance/security

- [ ] Canonical, title, description, OG/Twitter และ JSON-LD ถูกต้องบน home/novel/chapter
- [ ] `robots.txt` และ sitemap URLs ใช้ production domain
- [ ] Sitemap scale/pagination ผ่านชุดข้อมูลขนาด production ใกล้เคียงจริง
- [ ] Cover ใช้ image optimization/CDN และไม่มี layout shift สำคัญ
- [ ] ตรวจ CSP/security headers กับ OAuth/R2 บน production browser
- [ ] ตรวจ query plan ของ home/search/chapter navigation/library/ranking ด้วย production-like data
- [ ] ทดสอบ restore backup และ application rollback
