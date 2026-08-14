# NiyaiNow

แพลตฟอร์มอ่านนิยายภาษาไทยแบบ modular monolith บน Next.js App Router, PostgreSQL/Drizzle, Auth.js (Google OAuth เท่านั้น) และ Cloudflare R2 สำหรับไฟล์สื่อ เนื้อหาตอนอยู่ใน PostgreSQL และ render จาก Server Components; PostgreSQL เป็น source of truth ของข้อมูลแอปทั้งหมด

## เริ่มต้นใช้งาน

ต้องใช้ Node.js 22.12 ขึ้นไป, npm 11 และ PostgreSQL ที่เปิดใช้ extension `pg_trgm` ได้

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run db:migrate
$env:NODE_ENV='development'; $env:ALLOW_DEVELOPMENT_SEED='true'; npm.cmd run db:seed
npm.cmd run dev
```

แก้ `.env.local` ให้เป็นค่าจริงก่อน migrate หรือเปิดแอป รายการตัวแปรทั้งหมดอยู่ใน [.env.example](.env.example) โดยค่าที่จำเป็นต่อ runtime คือ:

- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ASSET_URL`
- `DATABASE_URL`
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

`NEXT_PUBLIC_APP_URL` และ `NEXT_PUBLIC_ASSET_URL` ต้องเป็น HTTPS URL จริงตั้งแต่ขั้น `next build` เพราะ canonical/sitemap และ image host policy ถูกฝังใน artifact การใส่สองค่านี้หลัง build ไม่แก้ artifact เดิม และ production build จะ fail closed หากขาดค่า

Google OAuth callback URI คือ `{NEXT_PUBLIC_APP_URL}/api/auth/callback/google` ระบบไม่มี password, OTP, magic link หรือการสมัครด้วยอีเมล

## คำสั่งหลัก

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run db:check
npm.cmd run build
npm.cmd run verify

npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:reconcile-engagement -- --limit=200
```

`npm run verify` เป็น quality gate เดียวกับ CI: lint → typecheck → tests → migration check → production build

`db:seed` ปิดโดยค่าเริ่มต้นและจะทำงานเฉพาะเมื่อกำหนด `ALLOW_DEVELOPMENT_SEED=true`; ห้ามตั้งค่านี้ใน production ส่วน `db:reconcile-engagement` เป็น dry-run โดยค่าเริ่มต้นและต้องเพิ่ม `--execute` เฉพาะใน durable job ที่ได้รับอนุมัติ

## ตั้งผู้ดูแลระบบ

บัญชี Google ใหม่มี role `READER` เสมอและไม่มีทางเลื่อนสิทธิ์ตัวเอง ให้เจ้าของฐานข้อมูล provision สิทธิ์จากช่องทางควบคุมเท่านั้น เช่น:

```sql
UPDATE users
SET role = 'ADMIN', updated_at = now()
WHERE lower(email) = lower('owner@example.com') AND status = 'ACTIVE';
```

ทุก admin mutation ตรวจ role/status จาก PostgreSQL ซ้ำ ไม่พึ่งการซ่อนเมนูหรือ JWT เพียงอย่างเดียว

## โครงสร้างสำคัญ

- `app/` — Server Components, route handlers, metadata, sitemap/robots
- `services/` — server-only data access และ transaction boundaries
- `db/schema/` — Drizzle schema; `drizzle/` — migration ที่ commit แล้ว
- `lib/auth/`, `lib/r2/`, `lib/validation/`, `lib/security/` — security boundaries กลาง
- `components/` — UI เดิมที่เชื่อมกับข้อมูลจริง; reader preferences เท่านั้นที่เก็บใน browser
- `tests/` และ `lib/**/*.test.ts` — critical domain/security tests

Development seed ใช้ข้อมูลนิยายสมมติเดิมเป็น input เพื่อให้ทดสอบ UI ได้ แต่ production runtime ไม่มี mock fallback และไม่ seed ผู้ใช้

## เอกสาร

- [Architecture](docs/architecture.md)
- [Database and indexes](db/README.md)
- [Operations and deployment](docs/operations.md)
- [Route audit](docs/route-audit.md)
- [Production checklist](docs/production-checklist.md)
- [Engineering implementation report](docs/implementation-report.md)

ค่าลับและ `.env*` ถูก ignore ทั้งหมด ยกเว้น `.env.example` ห้าม commit credential หรือ presigned URL ลง repository/log
