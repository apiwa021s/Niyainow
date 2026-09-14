# NovelNow B2 CDN Worker

Cloudflare Worker สำหรับอ่านรูปจาก Backblaze B2 private bucket ผ่าน custom
domain `images.novelnow.co` โค้ด signing อ้างอิงแนวทางจาก
[Backblaze cloudflare-b2](https://github.com/backblaze-b2-samples/cloudflare-b2)

Worker อนุญาตเฉพาะ `GET`/`HEAD` และ final media prefixes ที่แอปรองรับ ปิด
`/staging/*`, bucket listing และ prefix อื่นทั้งหมด

## Backblaze configuration

สร้าง application key แยกสำหรับ Worker โดยจำกัดเฉพาะ bucket `NovelNow` และให้
สิทธิ์ Read Only จากนั้นตั้ง Bucket Info เป็น:

```json
{"Cache-Control":"public, max-age=31536000, immutable"}
```

อย่าใช้ upload/read-write key ของแอปกับ Worker

## Install and verify

```powershell
cd infra/cloudflare-b2-cdn
npm.cmd install
npm.cmd run check
```

## Configure Cloudflare secrets

```powershell
npx.cmd wrangler login
npx.cmd wrangler secret put B2_APPLICATION_KEY_ID
npx.cmd wrangler secret put B2_APPLICATION_KEY
npx.cmd wrangler deploy
```

ทดสอบ deployment บน `workers.dev` ด้วย final object จริง และยืนยันว่า
`/staging/*` ได้ `403` พร้อม `Cache-Control: no-store`

## Attach the production hostname

ลบ CNAME เดิมของ `images.novelnow.co` ที่ชี้ไป Vercel ก่อน แล้ว uncomment
`[[routes]]` ใน `wrangler.toml` และ deploy อีกครั้ง หรือเพิ่ม Custom Domain จาก
Cloudflare Dashboard ที่ Worker > Settings > Domains & Routes

ตรวจ cache ด้วย URL ของ final object จริงสองครั้ง ครั้งแรกควรเป็น `MISS` และ
ครั้งถัดไปควรเป็น `HIT`:

```powershell
curl.exe -I "https://images.novelnow.co/covers/<uuid>.webp"
curl.exe -I "https://images.novelnow.co/covers/<uuid>.webp"
```
