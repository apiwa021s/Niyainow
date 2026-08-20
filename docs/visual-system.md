# NiyaiNow Visual System

สถานะ: ใช้งานจริง ตั้งแต่ 20 สิงหาคม 2026

เอกสารนี้เป็น source of truth สำหรับ visual language ของเว็บ discovery และ UI ทั่วไป ปกนิยายและ reader surface ยังมีหน้าที่เป็นพระเอกของตัวเอง จึงไม่ควรใช้สี accent กับเนื้อหาการอ่านเป็นวงกว้าง

## Direction

NiyaiNow ใช้ภาพลักษณ์แบบ **editorial reading lounge**: อบอุ่น สงบ และมีจังหวะของ pink action ที่ชัดเจน โครงสร้างหลักเป็นพื้น lavender อ่อนและ panel สี paper อุ่น ๆ ตัดกับ ink navy-charcoal สำหรับ navigation และข้อความสำคัญ

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Primary | `--brand-primary` | `#FF3E8B` | CTA, active state, progress, new signal |
| Secondary | `--brand-ink` | `#231F2A` | navigation, dark controls, strong contrast |
| Tertiary | `--neutral-50` | `#F9F7F2` | paper surface, calm content areas |
| Neutral | `--neutral-600` | `#635E6D` | secondary text, icons, metadata |
| UI canvas | `--bg-base` | `#F1ECF6` | page background and surrounding space |

ห้าม hard-code สีเหล่านี้ใน component ให้เรียกผ่าน semantic token หรือ Tailwind theme ที่ map ไว้ใน `app/globals.css` แทน

## Typography

- UI และ body ใช้ IBM Plex Sans Thai ผ่าน `font-sans`
- Heading ใช้ IBM Plex Sans Thai ผ่าน `font-sans` / `--font-display` เพื่อให้คม ทันสมัย และเป็นภาษาเดียวกับ navigation, card และ control
- Reader body ไม่เปลี่ยนตามเอกสารนี้ ให้ยึด `app/tokens.css` และ `docs/TYPOGRAPHY.md` เป็นหลัก
- Thai text ใช้ `letter-spacing: 0` และไม่ใช้ `text-align: justify`

## Shape And Surface

- Panel และ card ทั่วไปใช้ `--r-lg` (16px) เพื่อสร้างจังหวะเดียวกับ reference
- Control ขนาดเล็กใช้ `--r-md` (10px); pill ใช้ `--r-full` เฉพาะสถานะที่เป็น chip หรือ filter
- ใช้ border บางร่วมกับ shadow อ่อนเพื่อแยก panel ไม่ใช้เงาหนักหรือ gradient เป็นพื้นหลังหลัก
- `premium-panel` เป็น primitive สำหรับ panel ที่ต้องการกรอบชัด และไม่ควรซ้อน card อีกชั้นโดยไม่จำเป็น

## Interaction

- Pink สงวนไว้สำหรับ action และสถานะ active เพื่อให้ผู้ใช้กวาดสายตาหา action ได้
- Hover ใช้ `--brand-hover`; pressed ใช้ `--brand-active`
- Focus ring ต้องคงอยู่และใช้ `--ring` ห้ามลบเพื่อแลกกับความเรียบ
- Cover ใช้ artwork เป็นจุดเด่น การ hover เปลี่ยนเป็น accent ring โดยไม่ scale จน layout ขยับ
- ตรวจที่ viewport 320px และ desktop wide ก่อนส่งงานทุกครั้ง

## Change Checklist

- [ ] แก้ token ใน `app/globals.css` ก่อนแก้ component
- [ ] ไม่เพิ่มสีใหม่ใน JSX ถ้า semantic token เดิมรองรับอยู่แล้ว
- [ ] ทดสอบ `npm run lint` และ `npm run typecheck`
- [ ] ตรวจ reader typography tests เมื่อแก้ `app/tokens.css`
- [ ] อัปเดตเอกสารนี้เมื่อเปลี่ยน palette, typography หรือ radius หลัก
