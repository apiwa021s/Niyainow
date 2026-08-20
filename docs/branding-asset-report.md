# NiyaiNow Branding & Visual Asset Report

> เอกสารนี้เป็น asset direction และ prompt pack รุ่นเก่า ใช้เป็นแนวทางสร้างภาพเท่านั้น ระบบสีและ typography ที่ใช้งานจริงอยู่ใน [visual-system.md](visual-system.md) และ `app/globals.css` ห้ามนำค่าสีจาก prompt รุ่นเก่ามา hard-code ใน production

เอกสารนี้เป็น art direction และ prompt pack สำหรับใช้กับ ChatGPT / image generator เพื่อสร้าง branding asset ของ NiyaiNow ให้ดูเป็น production, จำง่าย, และมีเอกลักษณ์ต่อเนื่องทั้งเว็บไซต์

## 1. Brand Goal

NiyaiNow คือแพลตฟอร์มอ่านนิยายภาษาไทยที่ควรรู้สึกว่า "เร็ว ทันตอนใหม่ อ่านเพลิน และมีโลกนิยายอยู่ในมือ" ไม่ใช่เว็บรวมภาพทั่วไปหรือเว็บทดลอง

ภาพรวมแบรนด์ที่ต้องการ:

- Premium web novel platform สำหรับผู้อ่านไทย
- ทันสมัย แต่ยังอบอุ่นและอ่านง่าย
- มีพลังของ "ตอนใหม่มาแล้ว" ผ่านสัญลักษณ์สายฟ้า / แสง / spark
- มีความเป็นห้องสมุดดิจิทัล ผ่านหนังสือเปิด, bookmark, page, shelf, reading glow
- ใช้ได้จริงใน UI ขนาดเล็ก เช่น header, favicon, coin balance, badge, empty state

คำจำกัดความสั้น:

> Thai digital novel platform with a fast, magical reading pulse.

## 2. Brand Personality

- Fast: โหลดเร็ว, ตอนใหม่ชัด, กดอ่านต่อได้ทันที
- Immersive: มีบรรยากาศของโลกนิยาย แต่ไม่รก
- Trustworthy: production-ready, อ่านสบาย, ไม่เหมือนเว็บ mockup
- Distinctive: จำได้จากหนังสือเปิด + lightning/N mark + pink spark
- Reader-first: เหมาะกับคนอ่านนิยายต่อเนื่องทุกวัน

คำที่ใช้บรีฟ image model:

- premium
- cinematic but clean
- Thai online novel platform
- magical reading energy
- digital library
- modern app icon
- soft enamel detail
- readable at small size

คำที่ควรหลีกเลี่ยง:

- childish mascot
- generic anime girl as main logo
- stock purple gradient only
- overly detailed fantasy poster
- unreadable text inside icon
- fake 3D clutter
- crypto coin visual ที่ดูเหมือนเว็บลงทุน

## 3. Existing Visual Foundation (archived asset direction)

โปรเจกต์ปัจจุบันมี brand tokens ใน `app/globals.css` และ asset หลักใน `public/Images` อยู่แล้ว สำหรับ UI ให้ยึด [visual-system.md](visual-system.md) เป็นหลัก ส่วน prompt ในเอกสารนี้ใช้กับ asset ที่ต้องการ mood แบบ fantasy/editorial เท่านั้น

สีหลัก:

| Role | Color | Use |
| --- | --- | --- |
| Ink Charcoal | `#231F2A` | header/footer, dark controls, premium contrast |
| Primary Pink | `#FF3E8B` | primary CTA, active state, "new" signal |
| Paper | `#F9F7F2` | calm surfaces and asset backgrounds |
| Lavender Canvas | `#F1ECF6` | surrounding UI space |
| Neutral Plum | `#635E6D` | secondary labels, metadata, icon tone |
| Sky Blue | `#60A5FA` | genre/info accent, cool counterbalance |
| Paper Surface | `#F7F7FB` | light page background |

Recommended coin colors:

| Role | Color | Use |
| --- | --- | --- |
| Coin Gold | `#F7C948` | main coin face |
| Warm Edge | `#FFB020` | beveled rim, highlight |
| Antique Shadow | `#8A5A00` | engraved shadow |
| Violet Enamel | `#6D28FF` | brand inlay |
| Pink Spark | `#FF6EC7` | premium shine |

Core motif:

- Open book: แทน "นิยาย" และ reading flow
- Lightning / N stroke: แทน "Now", ความเร็ว, ตอนใหม่, energy
- Pink spark / moon dot: จุดจำแบรนด์, ใช้เป็น accent ซ้ำใน logo, coin, badge
- Rounded-square app shape: เหมาะกับ favicon, mobile icon, admin avatar

## 4. Master Style Guide For All Generated Assets

ใช้ prompt นี้เป็น style anchor ทุกครั้ง เพื่อให้ภาพแต่ละชุดออกมาเป็นตระกูลเดียวกัน

```text
Create a production-ready visual asset for "NiyaiNow", a Thai online novel reading platform. The brand combines a digital library, fast chapter updates, and magical reading energy. Use a distinctive open book motif, a lightning-shaped N symbol, and a small pink spark as the recurring identity. Style: premium modern app branding, clean vector-to-3D hybrid, soft enamel surfaces, crisp edges, subtle bevels, top-left studio lighting, high contrast, readable at small UI sizes. Color palette: deep ink purple #2B1257, royal violet #6D28FF, orchid #A855F7, novel pink #FF6EC7, sky blue #60A5FA, paper white #F7F7FB, optional warm gold #F7C948 for coins. Avoid clutter. No copyrighted characters. No random anime person as the logo. Transparent background unless specified.
```

Negative prompt กลาง:

```text
blurry, low resolution, generic stock logo, childish mascot, crypto investment coin, unreadable text, too many tiny details, busy fantasy poster, harsh neon, dark muddy colors, copied anime character, watermark, mockup frame, screenshot, bevels that obscure the symbol, extra letters, misspelled brand name
```

## 5. Asset Priority

### P0: Brand Core

ต้องทำก่อน เพราะใช้ทั่วทั้งเว็บ:

- Logo mark
- Wordmark
- App icon / favicon
- Coin icon
- Empty state illustration set
- Default cover/banner placeholder

### P1: Product Identity

ช่วยให้เว็บดูครบและน่าใช้:

- Genre tiles
- Ranking badges
- Premium / locked chapter badges
- OG social image
- Author avatar placeholder
- Chapter end divider

### P2: Polish

เพิ่มความน่าจำและความสนุก:

- Mini sticker / reaction set
- Seasonal banner template
- Admin dashboard accents
- Notification icon set
- Loading illustration

## 6. Logo System

### 6.1 Logo Mark

Purpose:

- ใช้ใน header, footer, admin shell, login page, app icon base
- ต้องอ่านรู้เรื่องที่ 24px
- ไม่ควรมีตัวอักษรยาวใน mark

Visual direction:

- Rounded-square symbol
- Open book เป็นรูปทรงหลัก
- Negative space เป็น lightning/N
- Pink spark จุดเล็กด้านบนหรือกลางเล่ม
- เส้นขอบหนาพอสำหรับ favicon
- Transparent background สำหรับ UI

Prompt:

```text
Design a distinctive logo mark for "NiyaiNow", a Thai online novel reading platform. Create a rounded-square premium app symbol showing an open book with a lightning-shaped N in the negative space, plus one small novel-pink spark accent. Use deep ink purple, royal violet, orchid, and novel pink. Style: clean vector logo with subtle 3D enamel depth, crisp edges, balanced symmetry, high readability at 24px, transparent background. No text, no mascot, no anime character.
```

Export:

- `public/Images/Logo/logo-mark.png`
- transparent PNG, 1024x1024
- SVG version if generator supports vector
- check at 16px, 24px, 32px, 64px

Acceptance checklist:

- ยังดูออกว่าเป็นหนังสือหรือสัญลักษณ์ N เมื่อย่อเล็ก
- ไม่มีรายละเอียดบางเกินไป
- พื้นหลังโปร่งใส
- จำจาก silhouette ได้

### 6.2 Wordmark

Purpose:

- Header desktop
- Footer
- Auth/admin pages
- Social/press image

Visual direction:

- Text: `NiyaiNow`
- ตัวอักษร modern rounded sans
- "Niyai" อาจใช้สี paper/ink, "Now" ใช้ violet/pink accent
- จุด spark เล็กบน i หรือใกล้ Now
- อย่าให้ฟอนต์แฟนตาซีเกินไป

Prompt:

```text
Create a production-ready wordmark for "NiyaiNow" using a modern rounded sans-serif style. Pair it with the open-book lightning-N logo mark on the left. The wordmark should feel like a premium Thai online novel platform: friendly, fast, trustworthy, and digital. Use deep ink purple for the main text, royal violet for "Now", and a tiny novel-pink spark accent. Clean spacing, high legibility, no extra slogan, transparent background.
```

Export:

- `public/Images/Logo/logo-wordmark-light.png` for light background
- `public/Images/Logo/logo-wordmark-dark.png` for dark background
- transparent PNG 2400x720
- SVG if possible

### 6.3 App Icon / Favicon

Purpose:

- Browser tab
- PWA/mobile icon
- Vercel/Google previews

Prompt:

```text
Create a 1024x1024 app icon for "NiyaiNow". Use the NiyaiNow logo mark: an open book with a lightning-shaped N, one small pink spark, and a premium rounded-square background. The background should be deep ink purple with a subtle royal violet glow, not a generic gradient. Style: modern app icon, soft enamel, clean bevel, crisp silhouette, readable at favicon size, no text.
```

Export:

- `public/icon.png` 1024x1024
- `public/favicon.ico`
- `public/apple-icon.png` 180x180
- `public/icon.svg` if vector is clean

## 7. Coin System

### 7.1 Main Coin

Purpose:

- Wallet
- Chapter unlock
- Admin coin settings
- Pricing cards in future

Important:

- เหรียญต้องรู้สึกเป็น "reading coin" ไม่ใช่ crypto/investment token
- ใช้ open book + lightning/N mark กลางเหรียญ
- สีทองเป็น support, violet/pink เป็น brand identity

Prompt:

```text
Design a premium reading coin for "NiyaiNow", a Thai online novel platform. The coin is warm gold with a beveled rim, violet enamel inlay, and an engraved open book with a lightning-shaped N at the center. Add a tiny pink spark highlight to connect with the brand. It should feel like a digital reading credit, not cryptocurrency. Style: clean 3D icon, soft studio lighting from top-left, crisp edges, transparent background, usable at 24px and 64px.
```

Negative prompt เพิ่ม:

```text
bitcoin, blockchain, dollar sign, finance logo, casino chip, messy symbols, tiny unreadable letters
```

Export:

- `public/Images/Assets/coin.png`
- transparent PNG 1024x1024
- small optimized WebP/PNG 128x128 for UI

### 7.2 Coin Stack

Purpose:

- Wallet empty/top-up future page
- Rewards/promotion
- Admin dashboard stat card

Prompt:

```text
Create a small stack of NiyaiNow reading coins. Each coin has a gold beveled rim, violet enamel center, engraved open book lightning-N mark, and tiny pink spark highlights. Premium digital product style, clean 3D, transparent background, not crypto, not casino, no text.
```

Export:

- `public/Images/Assets/coin-stack.png`
- transparent PNG 1600x1200

### 7.3 Premium Coin Variant

Purpose:

- Bonus coin, event reward, high-value purchase

Prompt:

```text
Create a premium variant of the NiyaiNow reading coin for bonus rewards. Use a richer gold rim, violet enamel center, pink spark glow, and a polished open-book lightning-N engraving. Make it feel more valuable but still consistent with the standard coin. Transparent background, clean 3D icon, no text, no crypto symbols.
```

Export:

- `public/Images/Assets/coin-premium.png`

## 8. Genre Tile Asset Set

Purpose:

- หน้า `/genres`
- หน้า home genre showcase
- card/banner สำหรับหมวด

Direction:

- ทุก genre ใช้ frame language เดียวกัน: rounded cover tile, subtle book/page motif, pink spark hidden somewhere
- ใช้ icon/symbol มากกว่าตัวละครเต็มตัว เพื่อไม่ให้ชนกับปกนิยายจริง
- แต่ละภาพควรยังอ่าน mood ออกใน 1 วินาที

Global genre prompt:

```text
Create a square genre tile for NiyaiNow, a Thai web novel platform. Style: premium illustrated app asset, clean cinematic icon scene, subtle open-book/page motif, one tiny pink spark accent, consistent with deep ink purple, royal violet, orchid, sky blue, and selected genre colors. No text. No copyrighted characters. It should work as a website category card and still be clear at small size.
```

Recommended files:

- `public/Images/genre/fantasy.png`
- `public/Images/genre/action.png`
- `public/Images/genre/adventure.png`
- `public/Images/genre/romance.png`
- `public/Images/genre/comedy.png`
- `public/Images/genre/system.png`
- `public/Images/genre/scifi.png`
- `public/Images/genre/horror.png`
- `public/Images/genre/investigation.png`
- `public/Images/genre/apocalypse.png`
- `public/Images/genre/xianxia.png`
- `public/Images/genre/bl-gl.png`

### Fantasy

```text
Create a fantasy genre tile for NiyaiNow. Show a glowing open book releasing a small violet portal, floating rune pages, and one pink spark. Premium illustrated app asset, magical but clean, deep ink purple and royal violet palette, no text, no character.
```

### Action

```text
Create an action genre tile for NiyaiNow. Show dynamic speed lines, a stylized lightning blade silhouette emerging from open pages, violet and hot pink energy, clean premium icon scene, no blood, no text, no character focus.
```

### Adventure

```text
Create an adventure genre tile for NiyaiNow. Show a folded map made from book pages, a glowing path, small compass mark, royal violet shadows and sky blue highlights, one pink spark, premium clean illustration, no text.
```

### Romance

```text
Create a romance genre tile for NiyaiNow. Show two bookmarks crossing over an open book, soft pink glow, violet paper shadows, tiny heart-shaped spark but not childish, premium clean app illustration, no text, no faces.
```

### Comedy

```text
Create a comedy genre tile for NiyaiNow. Show playful bouncing page shapes, a smiling bookmark symbol, pink and sky-blue spark accents, clean premium app illustration, not childish, no text, no mascot.
```

### System / GameLit

```text
Create a system novel genre tile for NiyaiNow. Show a futuristic translucent status window rising from an open book, a lightning-N glyph, violet UI panels, sky-blue data lines, one pink spark, premium digital library style, no readable text.
```

### Sci-Fi

```text
Create a sci-fi genre tile for NiyaiNow. Show an open book transforming into a small starship corridor or orbital ring, deep ink background, sky-blue light, violet panels, tiny pink spark, clean premium illustration, no text.
```

### Horror

```text
Create a horror genre tile for NiyaiNow. Show an open book casting a mysterious shadow, dark violet fog, pale blue moonlight, a restrained pink spark, premium eerie but not gory, no faces, no text.
```

### Investigation

```text
Create an investigation genre tile for NiyaiNow. Show a magnifying glass over glowing book pages, clue threads as thin violet lines, sky-blue highlight, one pink spark, premium clean detective mood, no text.
```

### Apocalypse

```text
Create an apocalypse genre tile for NiyaiNow. Show cracked book pages forming a ruined skyline silhouette with violet storm light and one pink spark of hope. Premium cinematic app illustration, not too dark, no text, no people.
```

### Xianxia / Cultivation

```text
Create a xianxia cultivation genre tile for NiyaiNow. Show floating scroll pages and a circular energy seal above an open book, violet celestial glow, gold accent, one pink spark, elegant premium illustration, no text, no copied cultural symbol.
```

### BL/GL/Y

```text
Create a BL/GL romance genre tile for NiyaiNow. Show two elegant bookmarks leaning together over open pages with a soft violet-pink glow and one tiny spark. Premium, inclusive, tasteful, no faces, no text, not childish.
```

## 9. Empty State Illustrations

Purpose:

- Library empty
- History empty
- Notifications empty
- Wallet unavailable/empty
- Search no results
- Admin empty tables

Style:

- Light background friendly illustration
- ใช้ brand mark subtly
- ไม่ใหญ่เกิน UI
- ไม่ใส่ข้อความในภาพ เพราะเว็บมี copy อยู่แล้ว

Global prompt:

```text
Create a clean empty-state illustration for NiyaiNow, a Thai online novel reading platform. Use premium soft 3D/vector hybrid style, paper-white base, deep ink purple shadows, royal violet accents, one small pink spark, and a subtle open-book motif. Transparent background. No text. Calm, useful, production-ready UI illustration.
```

### Empty Library

```text
Create an empty library illustration for NiyaiNow: a neat empty bookshelf shaped from open book pages, one bookmark waiting, violet shadows, small pink spark. Premium soft UI illustration, transparent background, no text.
```

File:

- `public/Images/empty/library.png`

### Empty Reading History

```text
Create an empty reading history illustration for NiyaiNow: an open book with a subtle clock trail made of page turns, violet and sky-blue accents, one pink spark. Clean production UI illustration, transparent background, no text.
```

File:

- `public/Images/empty/history.png`

### No Search Results

```text
Create a no-search-results illustration for NiyaiNow: a magnifying glass over blank glowing pages, small scattered bookmarks, deep ink purple shadow, sky-blue highlight, one pink spark. Clean UI illustration, transparent background, no text.
```

File:

- `public/Images/empty/search.png`

### Empty Notifications

```text
Create an empty notifications illustration for NiyaiNow: a quiet bell made from folded book pages, soft violet glow, one tiny pink spark resting beside it. Premium clean UI illustration, transparent background, no text.
```

File:

- `public/Images/empty/notifications.png`

### Wallet / Coin Unavailable

```text
Create a wallet empty-state illustration for NiyaiNow: a small open wallet with one NiyaiNow reading coin outline and an open book motif, warm gold accent, violet shadows, pink spark. It should not look like crypto or gambling. Transparent background, no text.
```

File:

- `public/Images/empty/wallet.png`

### Admin Empty Table

```text
Create a compact admin empty-state illustration for NiyaiNow: tidy stacked pages, a small database cylinder, and a violet lightning-N spark, clean professional SaaS style, transparent background, no text.
```

File:

- `public/Images/empty/admin-table.png`

## 10. Novel Cover & Banner Placeholders

Purpose:

- Admin upload form fallback
- Novel card fallback if cover missing
- Banner fallback if backdrop missing

### Cover Placeholder

Prompt:

```text
Create a default novel cover placeholder for NiyaiNow, 3:4 aspect ratio. Show an elegant open book silhouette with a lightning-N glow, deep ink purple background, royal violet page glow, small pink spark. Premium minimal cover art, no text, no character, no fake title.
```

Export:

- `public/Images/placeholders/novel-cover.png`
- 1200x1600
- WebP optimized version

### Banner Placeholder

Prompt:

```text
Create a wide default novel banner placeholder for NiyaiNow, 16:7 aspect ratio. Show flowing book pages across a deep ink purple background, a subtle lightning-N energy trail, royal violet and sky-blue highlights, one pink spark. Premium cinematic but clean, no text, no character.
```

Export:

- `public/Images/placeholders/novel-banner.png`
- 2400x1050
- WebP optimized version

## 11. Badge & Ranking System

Purpose:

- Ranking page
- Novel card "hot/new"
- Admin status
- Future rewards

Direction:

- Badge shape: compact medal/chip, usable at 20-40px
- Use geometric rank marks, not trophy overload
- Top 1/2/3 can have gold/silver/bronze, but still violet/pink brand accents

### Rank 1 Badge

```text
Create a compact rank #1 badge for NiyaiNow rankings. Premium gold medal with violet enamel center, small open-book lightning-N mark, pink spark highlight, clean icon, transparent background, no text except a clear number 1 if legible.
```

### Rank 2 Badge

```text
Create a compact rank #2 badge for NiyaiNow rankings. Premium silver medal with violet enamel center, small open-book lightning-N mark, pink spark highlight, clean icon, transparent background, no text except a clear number 2 if legible.
```

### Rank 3 Badge

```text
Create a compact rank #3 badge for NiyaiNow rankings. Premium bronze medal with violet enamel center, small open-book lightning-N mark, pink spark highlight, clean icon, transparent background, no text except a clear number 3 if legible.
```

### Hot Badge

```text
Create a compact "hot novel" icon badge for NiyaiNow. Use a stylized violet flame made from turning pages, one pink spark, clean premium UI icon, transparent background, no text.
```

### New Chapter Badge

```text
Create a compact "new chapter" icon badge for NiyaiNow. Use a small glowing page corner with lightning-N energy and a pink spark, clean premium UI icon, transparent background, no text.
```

Recommended files:

- `public/Images/badges/rank-1.png`
- `public/Images/badges/rank-2.png`
- `public/Images/badges/rank-3.png`
- `public/Images/badges/hot.png`
- `public/Images/badges/new-chapter.png`

## 12. Author & User Avatars

Purpose:

- Profile fallback
- Author page
- Comments/reviews

Direction:

- ไม่ควรใช้หน้าคนสุ่ม
- ใช้ glyph/initial container ที่เป็น brand system
- แยก reader/author/admin ได้ด้วย accent

### Reader Avatar Placeholder

```text
Create a default reader avatar placeholder for NiyaiNow. Circular icon with a small open book and bookmark silhouette, deep ink purple base, violet glow, pink spark. Friendly premium UI icon, transparent background, no face, no text.
```

### Author Avatar Placeholder

```text
Create a default author avatar placeholder for NiyaiNow. Circular icon with a fountain pen nib crossing an open book, violet enamel style, pink spark, clean premium UI icon, transparent background, no face, no text.
```

### Admin Avatar Placeholder

```text
Create a default admin avatar placeholder for NiyaiNow. Circular icon with a shield-shaped book mark and lightning-N glyph, deep ink purple, royal violet, sky-blue accent, clean professional UI icon, transparent background, no text.
```

Files:

- `public/Images/avatar/reader.png`
- `public/Images/avatar/author.png`
- `public/Images/avatar/admin.png`

## 13. OG / Social Preview Images

Purpose:

- Link preview for homepage, novel pages, genre pages
- Google/social share

Direction:

- OG image can include text, but must be generated/editable separately
- Background should feel like NiyaiNow, not random fantasy art
- Keep safe area center-left for text overlay if app renders metadata later

### Homepage OG Background

Prompt:

```text
Create a 1200x630 social preview background for NiyaiNow, a Thai online novel platform. Show an immersive digital library made of floating open pages, violet reading glow, sky-blue depth, and tiny pink sparks. Premium production website branding, cinematic but clean, leave negative space on the left for title text, no readable text in image, no characters, no logo mockup frame.
```

File:

- `public/Images/og/home.png`

### Genre OG Background

Prompt:

```text
Create a 1200x630 genre page social preview background for NiyaiNow. Show a set of glowing book portals representing multiple novel genres, each with a different subtle color accent, unified by deep ink purple, royal violet, and pink sparks. Premium clean website branding, leave space for text overlay, no readable text.
```

File:

- `public/Images/og/genres.png`

### Novel Detail OG Template Background

Prompt:

```text
Create a 1200x630 novel detail social preview template background for NiyaiNow. Deep ink purple premium backdrop with flowing page ribbons, a subtle lightning-N glow, and a reserved right-side area where a novel cover can be composited. Leave clean negative space for title text, no readable text in the image.
```

File:

- `public/Images/og/novel-template.png`

## 14. Reader Experience Assets

### Chapter End Divider

Purpose:

- ท้ายตอนนิยาย
- ใช้คั่น CTA อ่านตอนต่อไป / กลับหน้ารายละเอียด

Prompt:

```text
Create a thin decorative chapter-end divider for NiyaiNow. Use a delicate line made from turning pages, a tiny lightning-N at the center, and one pink spark. Minimal premium UI asset, transparent background, horizontal, no text.
```

Export:

- `public/Images/reader/chapter-divider.png`
- 1600x160 transparent

### Reading Progress Accent

Prompt:

```text
Create a slim reading progress accent for NiyaiNow: a glowing violet page-turn trail with small pink spark particles, clean UI asset, transparent background, horizontal, no text.
```

Export:

- `public/Images/reader/progress-accent.png`

## 15. Admin UI Asset Additions

Purpose:

- ให้หลังบ้านดู production โดยไม่รก
- ใช้ใน upload, empty state, unavailable modules

### Upload Cover Placeholder

```text
Create a compact upload placeholder illustration for NiyaiNow admin. Show an image frame with an open-book icon and upward upload spark, violet professional SaaS style, transparent background, no text.
```

### R2 File Verified Icon

```text
Create a small success icon for NiyaiNow admin file uploads. Show a clean check mark inside a tiny violet book-page badge with one pink spark. Professional UI icon, transparent background, no text.
```

### Unavailable Module Illustration

```text
Create a professional unavailable-module illustration for NiyaiNow admin. Show a locked panel made of book pages and a small lightning-N glyph, deep ink purple and sky-blue accents, clean SaaS UI style, transparent background, no text.
```

Files:

- `public/Images/admin/upload-placeholder.png`
- `public/Images/admin/file-verified.png`
- `public/Images/admin/unavailable-module.png`

## 16. Prompt Workflow For ChatGPT

ใช้ขั้นตอนนี้เพื่อให้ผลลัพธ์ไม่หลุด style:

1. ส่ง master style guide ก่อน
2. ให้สร้าง logo mark 4 variations
3. เลือก 1 ทิศทาง แล้วขอ "consistency sheet"
4. ใช้ logo ที่เลือกเป็น style reference สำหรับ coin, badge, empty states, genre tiles
5. สั่งทุก asset ว่า transparent background ยกเว้น OG/banner
6. ขอ export หลายขนาดหลังจากเลือก final
7. ตรวจ favicon/coin ที่ 24px ก่อน gen ชุดใหญ่

Prompt สำหรับเริ่มงานกับ ChatGPT:

```text
I want to rebrand NiyaiNow into a production-ready Thai online novel platform. Use the following art direction as a consistent visual system. First, create 4 logo mark concepts only. Do not create other assets yet. Each concept must use an open book, a lightning-shaped N for "Now", and a small pink spark. It must be recognizable at 24px, premium, modern, and not look like crypto, anime fan art, or a generic purple gradient logo.

Style anchor:
[paste the Master Style Guide here]
```

Prompt หลังเลือก logo:

```text
Use concept [selected concept] as the fixed NiyaiNow identity. Create a consistency sheet showing: logo mark, wordmark, app icon, reading coin, rank badge, empty library illustration, and one genre tile. Keep the same palette, lighting direction, bevel style, and pink spark placement logic. Transparent background for individual assets. No mockup frames.
```

Prompt สำหรับ batch asset:

```text
Using the selected NiyaiNow identity and consistency sheet, generate the following assets one by one. Keep the open-book lightning-N motif and pink spark consistent. Use transparent background unless the asset is an OG image or banner. After each asset, provide recommended filename, size, and whether it should be PNG, SVG, or WebP.

Asset list:
1. logo mark
2. wordmark
3. app icon
4. reading coin
5. coin stack
6. empty library
7. empty search
8. fantasy genre tile
9. system genre tile
10. homepage OG background
```

## 17. Export & Naming Convention

Recommended folder structure:

```text
public/
  Images/
    Logo/
      logo-mark.png
      logo-wordmark-light.png
      logo-wordmark-dark.png
      app-icon.png
    Assets/
      coin.png
      coin-stack.png
      coin-premium.png
    genre/
      fantasy.png
      action.png
      adventure.png
      romance.png
      comedy.png
      system.png
      scifi.png
      horror.png
      investigation.png
      apocalypse.png
      xianxia.png
      bl-gl.png
    empty/
      library.png
      history.png
      search.png
      notifications.png
      wallet.png
      admin-table.png
    placeholders/
      novel-cover.png
      novel-banner.png
    badges/
      rank-1.png
      rank-2.png
      rank-3.png
      hot.png
      new-chapter.png
    avatar/
      reader.png
      author.png
      admin.png
    og/
      home.png
      genres.png
      novel-template.png
    reader/
      chapter-divider.png
      progress-accent.png
    admin/
      upload-placeholder.png
      file-verified.png
      unavailable-module.png
```

Format guidance:

- Logo/icon: SVG + transparent PNG
- UI icon/coin/badge: transparent PNG, 1024 source, optimized 128/256 variant
- Genre tile: WebP or PNG, 1024x1024
- Empty state: transparent PNG/WebP, 1200x900
- Cover placeholder: WebP/PNG, 1200x1600
- Banner placeholder: WebP, 2400x1050
- OG: WebP/PNG, 1200x630

## 18. Production QA Checklist

ตรวจทุก asset ก่อนใช้จริง:

- Logo ยังจำได้ที่ 16px, 24px, 32px
- Coin ยังไม่ดูเหมือน crypto/casino
- ไม่มี watermark หรือ fake UI frame
- ไม่มีตัวหนังสือมั่วในภาพ ยกเว้น wordmark ที่ตั้งใจ
- ไม่มีตัวละคร/IP ที่เสี่ยงลิขสิทธิ์
- Light direction เหมือนกันทั้งชุด: top-left
- Pink spark ใช้เป็น signature ไม่กระจายจนรก
- Background transparent สำหรับ icon/UI asset
- Contrast ดีบนพื้นขาวและพื้นม่วงเข้ม
- ภาพไม่หนักเกินสำหรับเว็บ production
- ชื่อไฟล์เป็น lowercase/kebab-case
- มี fallback สำหรับ dark/light UI

## 19. Final Creative Direction Summary

NiyaiNow ควรมีภาพจำเป็น "หนังสือที่มีพลังสายฟ้าของตอนใหม่" โดยใช้ open book + lightning N + pink spark เป็นระบบเดียวกัน ไม่ใช่แค่โลโก้หนึ่งชิ้น สีม่วง-ชมพูเดิมยังใช้ได้ดี แต่ต้องเสริมด้วย gold สำหรับ coin และ sky blue เพื่อบาลานซ์ไม่ให้ทั้งเว็บเป็นม่วงอย่างเดียว

ถ้าเริ่มจาก logo ที่แข็งแรง แล้วบังคับให้ coin, badge, genre tile, empty state ใช้ motif เดียวกัน เว็บจะดูเป็น production brand ทันที แม้ยังค่อย ๆ เปลี่ยน asset ทีละชุด
