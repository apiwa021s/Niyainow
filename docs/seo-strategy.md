# SEO strategy: ตลาดนิยายไทย

อัปเดต: 19 สิงหาคม 2569

## ภาพรวมตลาดจากผลค้นหา

เว็บไซต์นิยายไทยที่ปรากฏเด่นในผลค้นหา เช่น Dek-D, readAwrite, Fictionlog, Tunwalai,
Kawebook, TofuNovel, NovelStore และ Novel.in.th ใช้ภาษาที่สะท้อน search intent คล้ายกัน:

- คำหลักกว้าง: `อ่านนิยายออนไลน์`, `นิยายออนไลน์`, `อ่านนิยายฟรี`, `นิยายแปลไทย`
- ประเทศต้นทาง: `นิยายจีนแปลไทย`, `นิยายเกาหลีแปลไทย`, `นิยายญี่ปุ่น`
- ความสดและสถานะ: `นิยายอัปเดตล่าสุด`, `ตอนใหม่`, `อัปเดตทุกวัน`, `นิยายจบแล้ว`
- แนวเรื่อง: `นิยายวาย`, `โรแมนติก`, `แฟนตาซี`, `จีนย้อนยุค`, `กำลังภายใน`
- พล็อต/โทรป: `ทะลุมิติ`, `เกิดใหม่`, `ระบบ`, `คลั่งรัก`
- การตัดสินใจอ่าน: `อันดับนิยาย`, `นิยายมาแรง`, `เรื่องน่าอ่าน`, `สารบัญทุกตอน`

แหล่งที่ใช้เทียบ positioning:

- https://novel.dek-d.com/
- https://www.readawrite.com/
- https://fictionlog.co/
- https://www.tunwalai.com/
- https://www.kawebook.com/
- https://tofunovel.com/
- https://novelstore.co/
- https://novel.in.th/

## Keyword map ของ NiyaiThai

| หน้า | Primary intent | Secondary intent | การ index |
| --- | --- | --- | --- |
| `/` | อ่านนิยายออนไลน์, นิยายแปลไทย | อ่านฟรี, อัปเดตทุกวัน | index |
| `/novels` | คลังนิยายออนไลน์ | ค้นหานิยายแปลไทยทุกแนว | index |
| `/novels?status=completed` | นิยายจบแล้ว | อ่านครบทุกตอน | index |
| `/novels?sort=new` | นิยายมาใหม่ | เรื่องใหม่สัปดาห์นี้ | index |
| `/novels?content=free` | นิยายอ่านฟรี | นิยายออนไลน์ฟรี | index |
| `/genres` | หมวดหมู่นิยายออนไลน์ | แฟนตาซี โรแมนติก วาย | index |
| `/genre/[slug]` | นิยาย{ชื่อแนว} อ่านออนไลน์ | ยอดนิยม, อัปเดตล่าสุด, จบแล้ว | index เฉพาะหน้าหลักและ pagination |
| `/tags` | แท็กนิยายยอดนิยม | พล็อต/โทรปนิยาย | index |
| `/tag/[slug]` | นิยาย{ชื่อพล็อต} อ่านออนไลน์ | เรื่องจบแล้ว, อัปเดตล่าสุด | index เฉพาะหน้าหลักและ pagination |
| `/updates` | นิยายอัปเดตล่าสุด | ตอนใหม่ | index |
| `/updates?range=today` | นิยายอัปเดตวันนี้ | ตอนใหม่วันนี้ | index |
| `/rankings` | อันดับนิยายกำลังนิยม | นิยายมาแรง, เรื่องน่าอ่าน | index |
| `/novel/[slug]` | {ชื่อเรื่อง} อ่านออนไลน์ | เรื่องย่อ, ผู้เขียน, ผู้แปล, จำนวนตอน | index |
| `/novel/[slug]/chapters` | สารบัญ {ชื่อเรื่อง} ทุกตอน | ค้นหาตอน | index เฉพาะหน้าหลักและ pagination |
| `/novel/[slug]/chapter/[chapter]` | {ชื่อเรื่อง} ตอนที่ {เลขตอน} | อ่านนิยายภาษาไทยออนไลน์ | index |
| `/search` และ URL ตัวกรองหลายมิติ | ค้นหาภายในเว็บไซต์ | — | noindex, follow |

## หลักการที่ใช้ในโค้ด

- title และ H1 บอก intent เดียวกันโดยไม่ยัดคำซ้ำ และต่อท้ายแบรนด์เพียงครั้งเดียว
- meta description สร้างจากข้อมูลจริงของแต่ละเรื่อง เช่น ผู้เขียน ผู้แปล จำนวนตอน และสถานะ
- URL ค้นหาและตัวกรองหลายมิติใช้ `noindex` เพื่อลดหน้าซ้ำและ keyword cannibalization
- canonical เป็น URL แบบ normalized และ pagination ใช้ self-canonical
- `WebSite`, `Organization`, `Book`, `Article`, `CollectionPage`, `ItemList` และ
  `BreadcrumbList` อ้างอิง entity เดียวกันด้วย URL จริง
- sitemap ส่งเฉพาะหน้าสาธารณะ พร้อม `lastmod`, ภาพปก, หน้ารายละเอียด, สารบัญ และตอนอ่าน
- robots.txt ไม่บล็อกหน้าที่ต้องให้ crawler อ่าน `noindex`
- ไม่ใช้ meta keywords เพราะ Google ไม่ใช้เป็น ranking signal; keyword ถูกวางในเนื้อหา,
  title, heading, anchor text และ taxonomy ที่ผู้ใช้เห็นจริง

## หลัง deploy

1. ตั้ง `GOOGLE_SITE_VERIFICATION` ใน production แล้ว deploy ใหม่
2. เพิ่ม domain property ใน Google Search Console และส่ง `/sitemap.xml`
3. ตรวจ URL ตัวอย่างอย่างน้อย 1 หน้าในแต่ละ template ด้วย URL Inspection และ Rich Results Test
4. ขอ indexing เฉพาะหน้าแรก, `/novels`, `/genres`, `/updates`, `/rankings` และนิยายสำคัญก่อน
5. วัด impressions, CTR, average position และ indexed pages ทุก 14 วัน แยกตาม query cluster
6. ปรับ title/description จาก query จริงที่มี impression สูงแต่ CTR ต่ำ ห้ามเปลี่ยน slug ตามคีย์เวิร์ดระยะสั้น

การติดหน้าแรกไม่สามารถรับประกันเวลาได้ เพราะอันดับยังขึ้นกับคุณภาพ/ความแตกต่างของเนื้อหา,
ประวัติโดเมน, ลิงก์อ้างอิง, พฤติกรรมผู้ใช้ และการแข่งขัน แต่โครงสร้างนี้ลดข้อผิดพลาดทางเทคนิค
และทำให้แต่ละหน้ามี search intent ที่ชัดพอสำหรับการเก็บข้อมูลและปรับรอบถัดไป

เอกสารอ้างอิงหลัก:

- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/appearance/snippet
- https://developers.google.com/search/docs/crawling-indexing/canonicalization
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
