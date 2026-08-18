# Architecture

## ภาพรวม

NovelNow เป็น modular monolith เพื่อให้ deploy และดูแลง่าย แต่แยก boundary ที่มีโอกาส scale ต่างกันอย่างชัดเจน

```text
Browser
  ├─ public HTML / Server Components ─┐
  ├─ Google OAuth ─ Auth.js           │
  ├─ authenticated JSON mutations     ├─ Next.js application
  └─ presigned media PUT ─────────────┘       │
                                               ├─ Drizzle/postgres.js ─ PostgreSQL
                                               └─ R2 S3 API ─ Cloudflare R2/CDN
```

PostgreSQL เป็น source of truth สำหรับ identity, content, publication state, library, progress/history, ratings/reviews, counters และ admin audit Chapter content เป็น `TEXT`; R2 เก็บเฉพาะ binary asset และฐานข้อมูลเก็บ object key ไม่เก็บ URL เต็ม

## Request และ render boundary

- Public pages เป็น Server Components และอ่าน DTO ที่ serialize ได้จาก `services/novel-service.ts`
- Chapter body ไม่เป็น prop ของ Client Component เนื้อหาที่อ่านได้ถูกสร้างเป็น server-rendered paragraph children; ตอนที่จำกัดส่งได้เฉพาะ excerpt เท่านั้น
- Client Components ใช้เฉพาะ search interaction, reader controls และ optimistic mutation ที่ยืนยันผลกับ route handler
- Root layout เป็น dynamic เพราะแสดง session-aware navigation แต่ public DAL ใช้ shared tagged cache จึงไม่ยิง query ซ้ำทุก request
- Personal/admin pages และ mutations ไม่ cache

## Authentication และ authorization

Auth.js ใช้ Google provider เพียงตัวเดียวและสร้าง/link ผู้ใช้ผ่าน Drizzle adapter Session ใช้ encrypted JWT เพื่อให้ Proxy ทำ optimistic route guard ได้เร็ว แต่ทุก protected DAL/write query อ่าน role/status ล่าสุดจาก PostgreSQL ด้วย `requireActiveUser()` หรือ `assertAdmin()`

Role คือ `READER | EDITOR | ADMIN`; user ใหม่เป็น `READER` เสมอ Proxy เป็น UX guard ไม่ใช่ security boundary สุดท้าย

## Data access

- React page/component ไม่ต่อฐานข้อมูลโดยตรงนอก service/DAL ที่กำหนด
- Public list/search/chapter queries มี limit/pagination และ batch relationship hydration เพื่อป้องกัน N+1
- Chapter navigation ใช้ `(novel_id, status, sort_order)` ไม่ใช้เลขตอน ±1 จึงรองรับ 10.5 และช่องว่าง
- Search อ่าน projection ที่รวม title/original/alternative title/author/genre/tag และใช้ PostgreSQL `pg_trgm` GIN; interface แยกไว้เพื่อเปลี่ยน search engine ภายหลัง
- View endpoint ตรวจ published target, rate-limit/dedupe โดยไม่เก็บ identity แล้วเพิ่ม aggregate และ Bangkok daily row แบบ atomic; ranking ใช้ snapshot เมื่อมี, aggregate daily rollup แบบ bounded สำหรับช่วงเวลา และใช้ all-time aggregate สำหรับตลอดกาล

## Cache และ invalidation

| ข้อมูล | นโยบาย | Tag หลัก |
|---|---:|---|
| search, latest updates | 60 วินาที | `public-search`, `public-chapters`, `public-novels` |
| novel/taxonomy/chapter metadata/rankings | 300 วินาที | `public-novels`, `public-taxonomy`, `public-chapters`, `public-rankings` |
| sitemap data | 1 ชั่วโมง | `public-sitemap` |
| library/progress/admin | ไม่ cache | — |

Admin publish/edit transaction revalidate tag ที่ได้รับผลหลัง commit เท่านั้น TTL เป็น safety net ไม่ใช่กลไก invalidation หลัก

Editorial/publication และ review-text removal ใช้ immediate expiry เพราะเป็น access/content boundary ส่วน counter จาก library/follow/rating ใช้ stale-while-revalidate เพื่อลด cache stampede; ค่า aggregate จึงอาจช้ากว่าธุรกรรมไม่เกิน cache window โดย state ส่วนบุคคลยังตอบจาก DB ทันที

## Consistency boundaries

- Publish/unpublish chapter + published counters + latest chapter + audit log อยู่ transaction เดียว
- Rating upsert + `rating_sum/rating_count/rating_average` อยู่ transaction เดียวและ serialize ต่อ novel
- Library/follow ใช้ unique key และปรับ aggregate เฉพาะ insert/delete จริง
- Progress/history เป็น upsert หนึ่งแถวต่อ `(user, novel)`; client throttle และ save ตอน visibility/page change
- Progress ฝั่ง browser ใช้ queue หนึ่ง request ต่อครั้งและ coalesce เป็น snapshot ล่าสุด; server serialize transaction ต่อ `(user, novel)` และเก็บเวลารับล่าสุด
- Review ที่แก้/ลบจะกลับเข้า moderation และ expire public review cache ทันที
- Upload ออก presigned URL หลังตรวจ user/role/MIME/size/extension; key สร้างฝั่ง server และ credential ไม่ออกสู่ browser
- Engagement aggregate ใช้ delta ภายใต้ statistics lock และ bounded reconciliation job ซ่อม drift เป็นระยะ

## Scale path

โครงสร้างรองรับ 10k+ novels/500k+ chapters ด้วย indexed bounded queries, paginated chapter lists, cached public reads, CDN media และ precomputed rankings สิ่งที่ควรเพิ่มเมื่อ traffic บังคับจริงคือ distributed rate limiter/counter buffer, job queue สำหรับ ranking/scheduled publish และ dedicated search—not microservices ก่อนมีความจำเป็น
