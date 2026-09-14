# NovelNow Reader RPG — Production Asset Brief

ระบบทำงานได้โดยไม่ต้องรอ asset เพิ่ม: Class ใช้ภาพจาก `public/Images/classs` และ `public/Images/class_icon` ส่วน Cosmetics ใช้ visual token จากฐานข้อมูลและ CSS ในปัจจุบัน เอกสารนี้คือรายการภาพที่ควรเพิ่มเพื่อยกระดับงานจริง โดยเรียงตามความสำคัญ

## Asset ที่มีอยู่แล้ว

| ชุด | จำนวน | ขนาดต้นฉบับ | การใช้งาน |
| --- | ---: | --- | --- |
| Class character cutout | 12 | 1086 × 1448 PNG, 2.39–2.88 MB/ภาพ | Card, Reveal, Personalized hero |
| Class icon | 12 | 1254 × 1254 PNG, 1.63–2.32 MB/ภาพ | Class chip, Profile, Mission |

ไฟล์เดิมครบทั้ง 12 Class รวมสายแซ่บและสายชิลแล้ว ไม่ต้องวาดซ้ำ แต่ควรเก็บ master และ export WebP/AVIF สำหรับ production เพื่อลด transfer size โดยคง alpha channel

## P0 — ควรทำก่อนเปิดใช้จริง

1. **Default reader avatar**
   - 1 ภาพ neutral ที่ไม่ใช่ icon AI และไม่ผูกเพศ
   - Master 1024 × 1024; export AVIF/WebP 512 × 512 และ 128 × 128
   - ใบหน้า/จุดสำคัญอยู่ในวง safe area กลางภาพ 72%
   - ชื่อไฟล์: `public/Images/reader-rpg/avatar/default-reader.{avif,webp}`

2. **Responsive class hero backplate — 12 Class**
   - Desktop 1600 × 640, focal subject อยู่ขวา 38%; เว้นซ้ายสำหรับข้อความ
   - Mobile 828 × 1104, focal subjectอยู่ช่วงบน 55%; เว้นล่างสำหรับ CTA
   - ห้าม bake ข้อความลงในภาพ เพื่อรองรับภาษาและ accessibility
   - ชื่อไฟล์: `hero/{class-id}-desktop.avif` และ `hero/{class-id}-mobile.avif`

3. **Cosmetic reward thumbnails**
   - อย่างน้อย 13 ภาพให้ตรงกับ catalog ปัจจุบัน
   - 512 × 512 WebP/AVIF, พื้นหลังโปร่งใส, subject อยู่ใน safe area 84%
   - แยก folder ตาม slot: `cosmetics/frame`, `card-effect`, `avatar-effect`, `title`, `badge`, `background`
   - ชื่อไฟล์ต้องตรง cosmetic id ในฐานข้อมูล เช่น `frame-origin.webp`

4. **Mystery box states**
   - `box-closed`, `box-opening`, `box-revealed`, `box-duplicate`
   - Still 768 × 768 WebP และ animation WebM 1–1.5 วินาที (ไม่มีเสียง)
   - WebM ต้องมี poster image และ UI ต้องใช้ still เมื่อเปิด Reduce Motion

5. **Mission and empty-state illustrations**
   - Daily, Weekly, all-complete, no-class และ no-cosmetics อย่างละ 1
   - 960 × 720 AVIF/WebP; composition ต้องอ่านออกได้เมื่อแสดงกว้าง 160 px
   - ไม่ใส่ตัวหนังสือในภาพ

## P1 — เพิ่มความรู้สึก RPG และ retention

1. **Streak flame tiers**: 1, 3, 7, 14, 30, 100 วัน — 256 × 256 transparent WebP
2. **Prestige crest tiers**: Prestige 1–5 — 512 × 512 transparent WebP
3. **Badge artwork**: Common/Rare/Epic/Legendary อย่างน้อย rarity ละ 3 — 256 × 256 transparent WebP
4. **Avatar frame overlays**: 1024 × 1024 transparent WebP; ช่องกลางโปร่งใสและ safe circle 70%
5. **Profile backgrounds**: Desktop 1440 × 480 และ Mobile 828 × 828; ทำ art direction แยก ไม่ใช้ crop อัตโนมัติ
6. **Share card background**: 1200 × 630 สำหรับแชร์ Class/Level/Prestige โดยเว้นพื้นที่ dynamic text

## Delivery rules

- ส่งทั้ง source master (PSD/AI/Figma) และ optimized export
- ใช้ sRGB, ตัด metadata, alpha แบบ premultiplied-safe และห้าม upscale
- AVIF เป็นตัวหลัก, WebP เป็น fallback; PNG ใช้เฉพาะภาพที่ต้องเก็บ alpha แล้ว artifact จาก WebP/AVIF ยังเห็นชัด
- เป้าหมายขนาด: icon ≤ 80 KB, thumbnail ≤ 140 KB, mobile hero ≤ 260 KB, desktop hero ≤ 420 KB
- ทุกภาพต้องระบุ `focal point`, `alt intent` และ light/dark contrast note ใน handoff
- ห้ามใส่ชื่อผู้ใช้, Level, EXP, ชื่อ Class หรือข้อความ UI ลงใน bitmap
- ทดสอบ crop ที่ 320, 375, 430, 768, 1024, 1440 และ 1920 px

## Class file mapping

| No. | Class | id |
| ---: | --- | --- |
| 01 | เซียนยุทธ์ | `martial` |
| 02 | สาวกวาย | `bl` |
| 03 | ยูริเลิฟเวอร์ | `yuri` |
| 04 | นักล่าหัวใจ | `romance` |
| 05 | สายดาร์ก | `dark` |
| 06 | คุณหนูเกิดใหม่ | `reborn` |
| 07 | จอมเวทต่างโลก | `isekai` |
| 08 | ผู้เล่นระบบ | `system` |
| 09 | นักไขปริศนา | `mystery` |
| 10 | นักล่าความหลอน | `horror` |
| 11 | สายแซ่บ | `spicy` |
| 12 | สายชิล | `cozy` |

ก่อน export รอบจริง ให้ตรวจ id ใน `lib/onboarding/reader-class.ts` เป็น source of truth หากมีการเปลี่ยนชื่อ slug
