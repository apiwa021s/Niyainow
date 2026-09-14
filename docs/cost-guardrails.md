# Production cost guardrails (public surface)

ขอบเขตการตรวจนี้ครอบคลุม anonymous, reader, creator-facing Studio และ NovelNow World โดยไม่รวมหน้า/API/worker ฝั่ง admin และงาน AI translation ตามคำขอ

## สิ่งที่ป้องกันในโค้ดแล้ว

| Surface | ความเสี่ยงเดิม | Guardrail ปัจจุบัน |
| --- | --- | --- |
| Authentication | หลัง Auth.js database session โหลด user แล้ว DAL query `users` ซ้ำ | ใช้ข้อมูล user จาก database-session callback โดยตรง เหลือ DB lookup ของ adapter เพียงรอบเดียวต่อ request memoization boundary |
| Home/master data APIs | cold request ยิง 4–5 query bundles ซ้ำ | Cache Components พร้อม tag invalidation และ CDN `s-maxage` |
| Search suggestions | ทุก prefix ยิง full suggestion fan-out | debounce 400 ms, in-tab LRU-like cache 30 คำ/5 นาที, distributed limit 120/minute |
| Search/discover APIs | เรียก DB ได้ไม่จำกัดและ discover offset ได้ถึง 10,000 หน้า | distributed limits 30/60 ต่อนาที, CDN SWR, discover จำกัดหน้า 200 |
| View events | parse body ก่อน abuse check และทุก accepted event เขียน aggregate | same-origin + distributed limit ก่อน parse, client/server dedupe; DB write ยังเป็นหนึ่งจุดที่ต้องดู telemetry |
| Notifications | ทุก signed-in tab poll ทุก 60 วินาที | poll ทุก 5 นาที, เฉพาะ tab ที่ visible, visibility refresh มี throttle 60 วินาที |
| Public lists | chapter/post loaders ไม่มีเพดาน | chapter 200, public posts 50, Studio posts 100 |
| World position | snapshot ทำ write ทุก 30 วินาทีแม้อยู่ที่เดิม | snapshot 60 วินาที, บันทึกเมื่อเคลื่อนอย่างน้อย 8 px, force เฉพาะ navigation/pagehide |
| World presence | movement สูงสุด 12.5 events/sec, server fan-out ไม่มี throttle และ reconnect ไม่จำกัด | client 8.3 events/sec, server throttle movement/state/emote, disconnect เมื่อ tab hidden, reconnect สูงสุด 20 ครั้งพร้อม jitter/backoff สูงสุด 30 วินาที |
| World capacity | รองรับได้ถึง 999 ห้อง × 50 คนโดยไม่มี global ceiling | default hard caps 500 connections, 10 rooms, 50 คน/ห้อง ปรับได้ด้วย environment ภายใน server bounds |
| Social image | default PNG ประมาณ 2.0 MB และขนาดไม่ตรง metadata | JPEG 1200×630 ประมาณ 108 KB |

## จุดที่ต้องตั้งนอก repository ก่อนเปิดจริง

1. ตั้ง hard budget และ pause action ใน Vercel Spend Management; alert อย่างเดียวไม่หยุดค่าใช้จ่าย
2. วาง WAF rate limits หน้า reader, search, discover, view event, auth และ World เพื่อให้ traffic ที่ถูกปฏิเสธไม่เรียก Function/Redis/PostgreSQL
3. ล็อก origin ไม่ให้ bypass Cloudflare และเชื่อถือ `CF-Connecting-IP` เฉพาะหลังล็อก origin แล้ว
4. ตั้ง database connection budget จากค่าต่อ instance คูณจำนวน instance และ worker สูงสุด พร้อมเผื่อ migration/operations
5. ตั้ง Redis memory/eviction/connection ceilings และ World concurrent-connection/message ceilings
6. เปิด usage/anomaly alerts และ dashboard อย่างน้อย: requests, function duration, DB queries/latency/pool wait, Redis hit ratio/evictions, B2 egress, image transformations, World sockets/messages

## จุดที่ยังควรทำหลังมี production telemetry

- แยก route-group layout: `AppShell` ปัจจุบันอาจเรียก server work ของ personalized topbar/updates rail แม้หน้า reader หรือ World ซ่อน UI นั้นอยู่
- ทำ dedicated suggestion query/index: suggestion service ยัง reuse full search pipeline หลาย query; ตอนนี้ลดความถี่และจำกัด abuse แล้ว แต่ query shape ยังแพงกว่าที่จำเป็น
- เปลี่ยน view aggregate เป็น durable buffered counters เฉพาะเมื่อมี worker flush แบบ idempotent และ reconciliation พร้อมใช้งาน ห้ามใช้ volatile buffer เป็น source of truth
- เปลี่ยน offset pagination เป็น cursor เมื่อ query telemetry แสดงว่าผู้ใช้จริงเข้าหน้าลึก

## Launch verification

- ยิง load test บน staging ที่ใช้ขนาดข้อมูลใกล้ production แล้วเทียบ p95/p99, SQL/query count, cache hit ratio และ function duration
- ทดสอบ limit จาก IP เดียวและหลาย session; ตรวจว่า 429 ที่ edge ไม่ถึง application logs และ 429 ใน app ไม่ถึง DB loader
- เปิด World หลาย tab, ซ่อน tab, ตัด network แล้วตรวจจำนวน ticket/reconnect/position writes
- ตรวจ cache invalidation หลัง publish/unpublish และแก้โปรไฟล์นักเขียน
- ตั้ง alert จาก baseline จริงในสัปดาห์แรก แล้วลดเพดานอย่างค่อยเป็นค่อยไปโดยดู false positive
