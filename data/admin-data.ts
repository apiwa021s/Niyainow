import { chapters as readerChapters, novels } from "@/data/mock-data";
import type {
  AdminActivity,
  AdminAnnouncement,
  AdminBanner,
  AdminChapter,
  AdminComment,
  AdminNovel,
  AdminPayout,
  AdminReport,
  AdminTransaction,
  Member,
  NovelSubmission,
  SeriesPoint,
  StaffMember
} from "@/types/admin";

/* =========================================================================
   Mock data ฝั่งหลังบ้าน
   ทุกค่าคำนวณจาก index ล้วน ๆ (LCG ด้านล่าง) — ต้อง deterministic
   ไม่งั้น server กับ client เรนเดอร์คนละค่าแล้วเกิด hydration mismatch
   (เหตุผลเดียวกับ data/mock-data.ts)
   ========================================================================= */

/** สุ่มแบบกำหนดผลได้ 0–1 จาก seed — ใช้แทน Math.random ที่ห้ามใช้ */
function seeded(seed: number) {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

/** เลือกสมาชิกในลิสต์แบบวนซ้ำ อ่านง่ายกว่าเขียน % ทุกที่ */
function pick<T>(list: readonly T[], index: number) {
  return list[index % list.length];
}

/** วันที่อ้างอิงของชุดข้อมูลนี้ — ตรึงไว้ ไม่ใช้ new Date() */
export const ADMIN_TODAY = "14 ส.ค. 2026";

const relativeTimes = [
  "5 นาทีที่แล้ว",
  "20 นาทีที่แล้ว",
  "1 ชั่วโมงที่แล้ว",
  "3 ชั่วโมงที่แล้ว",
  "เมื่อวาน 21:40",
  "2 วันที่แล้ว",
  "5 วันที่แล้ว",
  "สัปดาห์ที่แล้ว"
];

const dateLabels = [
  "14 ส.ค. 2026",
  "13 ส.ค. 2026",
  "11 ส.ค. 2026",
  "08 ส.ค. 2026",
  "02 ส.ค. 2026",
  "27 ก.ค. 2026",
  "19 ก.ค. 2026",
  "05 ก.ค. 2026",
  "21 มิ.ย. 2026",
  "14 พ.ค. 2026",
  "30 มี.ค. 2026",
  "12 ม.ค. 2026"
];

/* ---------------------------------------------------------------- ทีมงาน */

export const staffMembers: StaffMember[] = [
  {
    id: "stf-001",
    name: "ปิยะวัฒน์ ศรีสุข",
    email: "piya@niyainow.test",
    role: "owner",
    status: "active",
    lastActive: "กำลังออนไลน์",
    actionsThisMonth: 412
  },
  {
    id: "stf-002",
    name: "ณัฐฐา ทองแท้",
    email: "nattha@niyainow.test",
    role: "admin",
    status: "active",
    lastActive: "12 นาทีที่แล้ว",
    actionsThisMonth: 336
  },
  {
    id: "stf-003",
    name: "กิตติพงษ์ ใจดี",
    email: "kittipong@niyainow.test",
    role: "editor",
    status: "active",
    lastActive: "1 ชั่วโมงที่แล้ว",
    actionsThisMonth: 289
  },
  {
    id: "stf-004",
    name: "อารียา พงศ์ไพศาล",
    email: "areeya@niyainow.test",
    role: "moderator",
    status: "active",
    lastActive: "3 ชั่วโมงที่แล้ว",
    actionsThisMonth: 512
  },
  {
    id: "stf-005",
    name: "ธนกฤต วัฒนชัย",
    email: "thanakrit@niyainow.test",
    role: "support",
    status: "invited",
    lastActive: "ยังไม่เคยเข้าใช้งาน",
    actionsThisMonth: 0
  },
  {
    id: "stf-006",
    name: "ศิริพร มณีวงศ์",
    email: "siriporn@niyainow.test",
    role: "moderator",
    status: "suspended",
    lastActive: "3 สัปดาห์ที่แล้ว",
    actionsThisMonth: 24
  }
];

/* ----------------------------------------------------------------- นิยาย */

const publishCycle = ["published", "published", "published", "scheduled", "published", "draft", "published", "review"] as const;

/** เติมฟิลด์ฝั่งหลังบ้านให้นิยายทุกเรื่องที่มีอยู่แล้ว */
export const adminNovels: AdminNovel[] = novels.map((novel, index) => {
  const noise = seeded(index + 7);
  return {
    ...novel,
    publishStatus: index === 5 ? "rejected" : pick(publishCycle, index),
    owner: novel.translator ?? "NiyaiNow Translation",
    reports: index % 5 === 0 ? Math.round(noise * 6) : 0,
    revenueTHB: Math.round((novel.views / 1000) * (12 + noise * 26)),
    viewsThisWeek: Math.round(novel.views * (0.02 + noise * 0.03)),
    publishedAt: pick(dateLabels, index + 3),
    scheduledChapters: index % 4 === 0 ? 1 + Math.round(noise * 4) : 0
  };
});

/* ------------------------------------------------------------------ ตอน */

const chapterEditors = ["กิตติพงษ์ ใจดี", "ณัฐฐา ทองแท้", "ทีมแปลจันทร์เสี้ยว", "ห้องแปลดาวเหนือ", "Studio Inkwell"];

export const adminChapters: AdminChapter[] = readerChapters.map((chapter, index) => {
  const novel = novels.find((item) => item.slug === chapter.novelSlug);
  const noise = seeded(index + 31);
  const scheduled = index % 17 === 3;
  const draft = index % 23 === 5;

  return {
    id: `${chapter.novelSlug}-${chapter.number}`,
    novelSlug: chapter.novelSlug,
    novelTitle: novel?.thaiTitle ?? chapter.novelSlug,
    number: chapter.number,
    title: chapter.title,
    publishStatus: scheduled ? "scheduled" : draft ? "draft" : "published",
    words: 1800 + Math.round(noise * 2600),
    locked: Boolean(chapter.locked),
    coinPrice: chapter.coinPrice ?? 0,
    views: Math.round((novel?.views ?? 100000) * (0.004 + noise * 0.02)),
    comments: Math.round(noise * 180),
    updatedAt: pick(relativeTimes, index),
    scheduledFor: scheduled ? `${pick(dateLabels, index)} 20:00 น.` : undefined,
    editor: pick(chapterEditors, index)
  };
});

/* ------------------------------------------------------- นิยายรออนุมัติ */

export const novelSubmissions: NovelSubmission[] = [
  {
    id: "sub-001",
    title: "The Ledger of Broken Vows",
    thaiTitle: "บัญชีคำสาบานที่แตกสลาย",
    author: "Paper Crane",
    submittedBy: "ทีมแปลกระดาษพับ",
    genres: ["fantasy", "mystery"],
    synopsis: "นักบัญชีของวิหารพบว่าคำสาบานทุกคำถูกบันทึกเป็นหนี้ และมีคนกำลังไล่ทวงคืนทีละคน",
    cover: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80",
    chapters: 12,
    submittedAt: "2 ชั่วโมงที่แล้ว",
    status: "pending"
  },
  {
    id: "sub-002",
    title: "Midnight Ramen Guild",
    thaiTitle: "กิลด์ราเมนเที่ยงคืน",
    author: "Broth & Bone",
    submittedBy: "Studio Inkwell",
    genres: ["comedy", "system", "adventure"],
    synopsis: "ร้านราเมนที่เปิดเฉพาะเที่ยงคืน รับลูกค้าได้เฉพาะคนที่เพิ่งรอดตายจากดันเจียน",
    cover: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=600&q=80",
    chapters: 24,
    submittedAt: "6 ชั่วโมงที่แล้ว",
    status: "pending"
  },
  {
    id: "sub-003",
    title: "Cartographer of Dead Stars",
    thaiTitle: "นักเขียนแผนที่ดาวที่ตายแล้ว",
    author: "Vega Signal",
    submittedBy: "ห้องแปลดาวเหนือ",
    genres: ["sci-fi", "adventure"],
    synopsis: "แผนที่ที่เขาวาดกลายเป็นจริงเสมอ ปัญหาคือเขาเพิ่งวาดดาวที่ยังไม่มีใครเห็น",
    cover: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=600&q=80",
    chapters: 8,
    submittedAt: "เมื่อวาน 18:20",
    status: "pending"
  },
  {
    id: "sub-004",
    title: "Her Majesty's Pawnshop",
    thaiTitle: "โรงรับจำนำของฝ่าบาท",
    author: "Rosewell",
    submittedBy: "กลุ่มอักษรม่วง",
    genres: ["romance", "comedy"],
    synopsis: "ราชินีที่ถังแตกเปิดโรงรับจำนำลับ รับจำนำได้ทุกอย่าง ยกเว้นหัวใจของตัวเอง",
    cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    chapters: 31,
    submittedAt: "2 วันที่แล้ว",
    status: "approved"
  },
  {
    id: "sub-005",
    title: "Seven Days of Rain",
    thaiTitle: "เจ็ดวันแห่งสายฝน",
    author: "Quiet Fern",
    submittedBy: "ทีมแปลสายฟ้า",
    genres: ["romance", "mystery"],
    synopsis: "ฝนที่ตกติดกันเจ็ดวันจะพาคนที่หายไปกลับมาหนึ่งคน แต่ต้องแลกกับคนที่ยังอยู่",
    cover: "https://images.unsplash.com/photo-1428592953211-077101b2021b?auto=format&fit=crop&w=600&q=80",
    chapters: 5,
    submittedAt: "3 วันที่แล้ว",
    status: "rejected",
    note: "ตัวอย่าง 5 ตอนแรกยังไม่ผ่านเกณฑ์การพิสูจน์อักษร แนะนำให้ตรวจคำผิดและส่งกลับมาใหม่"
  },
  {
    id: "sub-006",
    title: "The Butcher of Silver Lane",
    thaiTitle: "คนขายเนื้อแห่งซอยเงิน",
    author: "Ashfall",
    submittedBy: "ทีมแปลจันทร์เสี้ยว",
    genres: ["horror", "mystery", "action"],
    synopsis: "ทุกคนในซอยรู้ว่าเขาขายเนื้ออะไร แต่ไม่มีใครกล้าถามว่าเขาซื้อมาจากไหน",
    cover: "https://images.unsplash.com/photo-1509909756405-be0199881695?auto=format&fit=crop&w=600&q=80",
    chapters: 17,
    submittedAt: "5 วันที่แล้ว",
    status: "pending"
  }
];

/* -------------------------------------------------------------- สมาชิก */

const memberNames = [
  ["moonreader", "นักอ่านจันทร์"],
  ["kanya.p", "กันยา ประเสริฐ"],
  ["darkwing", "ปีกราตรี"],
  ["ploy_reads", "พลอย รักอ่าน"],
  ["thanwa", "ธันวา สุขใจ"],
  ["inkwell.th", "หมึกไทย"],
  ["shadowfan", "แฟนเงามืด"],
  ["nong.mint", "น้องมิ้นท์"],
  ["ravenclaw99", "เรเวน"],
  ["somchai.dev", "สมชาย ว่องไว"],
  ["bookworm.bkk", "หนอนหนังสือกรุงเทพ"],
  ["lalita.m", "ลลิตา มีสุข"],
  ["ghostwriter", "นักเขียนเงา"],
  ["pim.reader", "พิมพ์ อ่านทุกวัน"],
  ["chai_translate", "ชัย นักแปล"],
  ["nightowl.th", "นกฮูกกลางคืน"],
  ["fahsai", "ฟ้าใส วันใหม่"],
  ["korn.k", "กร กิตติ"],
  ["mali.story", "มะลิ เล่าเรื่อง"],
  ["tanaka.th", "ทานากะสายไทย"],
  ["blueberry", "บลูเบอร์รี่"],
  ["arm.reader", "อาร์ม นักอ่าน"],
  ["preeda.w", "ปรีดา วงศ์ใหญ่"],
  ["sunset.club", "ชมรมพระอาทิตย์ตก"]
] as const;

const memberRoles = ["reader", "reader", "reader", "translator", "reader", "author"] as const;
const memberStatuses = ["active", "active", "active", "active", "suspended", "active", "active", "banned"] as const;

export const members: Member[] = memberNames.map(([username, displayName], index) => {
  const noise = seeded(index + 13);
  const status = pick(memberStatuses, index);

  return {
    id: `usr-${String(index + 1).padStart(4, "0")}`,
    username,
    displayName,
    email: `${username.replace(/[^a-z0-9.]/g, "")}@example.test`,
    role: pick(memberRoles, index),
    status,
    joinedAt: pick(dateLabels, index + 4),
    lastActive: pick(relativeTimes, index + 2),
    coins: Math.round(noise * 2400),
    spentTHB: Math.round(noise * 8600),
    chaptersRead: Math.round(noise * 1800),
    follows: Math.round(noise * 60),
    verified: index % 4 !== 3,
    reports: status === "active" ? (index % 7 === 0 ? 1 : 0) : 2 + Math.round(noise * 5)
  };
});

/* ------------------------------------------------------------ คอมเมนต์ */

const commentBodies = [
  "ตอนนี้พีคมาก อ่านรวดเดียวจบเลยครับ รอตอนต่อไปแบบใจจดใจจ่อ",
  "แปลลื่นมากค่ะ อ่านแล้วไม่สะดุดเลย ขอบคุณทีมแปลนะคะ",
  "สปอยล์นะครับ ตัวละครหลักจะตายในตอนที่ 190 ใครยังไม่อ่านอย่าเพิ่งเลื่อนลง",
  "รับแปลนิยายราคาถูก ทักไลน์ @xxxxx รับงานด่วนทุกแนว",
  "ปมนี้ผูกไว้ตั้งแต่ตอนที่ 12 เพิ่งมาเฉลยตอนนี้ คนเขียนวางแผนมาดีจริง ๆ",
  "ตอนนี้ราคาเหรียญแพงไปไหมครับ ตอนสั้นกว่าปกติแต่คิดราคาเท่าเดิม",
  "อ่านซ้ำรอบที่สามแล้ว ยังขนลุกตรงฉากในหอสมุดอยู่เลย",
  "ไอ้พวกที่มาสปอยล์ในคอมเมนต์นี่มันแย่มาก ๆ ควรโดนแบนถาวรไปเลย",
  "ขอบคุณสำหรับตอนพิเศษครับ คุ้มค่าเหรียญที่จ่ายไปมาก",
  "ทำไมตอนนี้อัปช้าจังครับ รอมาสองสัปดาห์แล้ว",
  "ฉากต่อสู้เขียนเห็นภาพมาก เหมือนดูอนิเมะอยู่เลยค่ะ",
  "เนื้อเรื่องเริ่มยืดแล้วนะ ตอนหลัง ๆ แทบไม่มีอะไรคืบหน้า",
  "แอดมินครับ ลิงก์ตอนที่ 88 เปิดไม่ได้ ขึ้นหน้าเปล่า",
  "ชอบตัวละครรองมากกว่าตัวเอกอีก เขียนมีมิติดีจัง",
  "ด่าผู้แปลแรง ๆ ไปก็ไม่ได้ช่วยอะไร รอหน่อยก็ได้ครับ",
  "โกงชัด ๆ ตอนพิเศษควรฟรีสิ เก็บเงินแบบนี้ไม่ไหวนะ",
  "ใครอ่านต้นฉบับแล้วบ้าง ตอนจบต่างจากที่แปลไหมคะ",
  "ทีมแปลตั้งใจมากครับ เชิงอรรถอธิบายศัพท์จีนละเอียดดี"
];

const commentStatusCycle = ["visible", "visible", "pending", "visible", "hidden", "visible", "spam", "visible"] as const;

export const adminComments: AdminComment[] = commentBodies.map((body, index) => {
  const novel = novels[index % novels.length];
  const member = members[index % members.length];
  const noise = seeded(index + 47);

  return {
    id: `cmt-${String(index + 1).padStart(4, "0")}`,
    memberId: member.id,
    author: member.displayName,
    novelSlug: novel.slug,
    novelTitle: novel.thaiTitle,
    chapter: 1 + (index % 8),
    body,
    createdAt: pick(relativeTimes, index),
    status: pick(commentStatusCycle, index),
    likes: Math.round(noise * 240),
    reports: index % 3 === 0 ? Math.round(noise * 9) : 0
  };
});

/* -------------------------------------------------------------- รายงาน */

export const adminReports: AdminReport[] = [
  {
    id: "rpt-0001",
    targetType: "comment",
    targetLabel: "คอมเมนต์ของ ปีกราตรี — “สปอยล์นะครับ ตัวละครหลักจะตาย…”",
    targetHref: "/admin/comments?q=สปอยล์",
    reason: "spoiler",
    detail: "สปอยล์ตอนจบในคอมเมนต์แรกของตอน ทำให้คนอ่านที่ยังไม่ถึงเสียอรรถรส",
    reporter: "moonreader",
    createdAt: "18 นาทีที่แล้ว",
    status: "open",
    priority: "medium"
  },
  {
    id: "rpt-0002",
    targetType: "comment",
    targetLabel: "คอมเมนต์ของ น้องมิ้นท์ — “รับแปลนิยายราคาถูก ทักไลน์…”",
    targetHref: "/admin/comments?status=spam",
    reason: "spam",
    detail: "โฆษณาบริการรับแปล โพสต์ซ้ำใน 14 เรื่องภายในชั่วโมงเดียว",
    reporter: "ระบบตรวจจับอัตโนมัติ",
    createdAt: "42 นาทีที่แล้ว",
    status: "open",
    priority: "high"
  },
  {
    id: "rpt-0003",
    targetType: "novel",
    targetLabel: "ราชันอมตะผงาดฟ้า",
    targetHref: "/admin/novels/immortal-king",
    reason: "copyright",
    detail: "สำนักพิมพ์แจ้งว่าเป็นงานแปลที่ไม่ได้รับอนุญาต ขอให้ระงับการเผยแพร่ระหว่างตรวจสอบ",
    reporter: "legal@publisher.test",
    createdAt: "3 ชั่วโมงที่แล้ว",
    status: "reviewing",
    priority: "high"
  },
  {
    id: "rpt-0004",
    targetType: "chapter",
    targetLabel: "สถาบันเวรยามราตรี — ตอนที่ 6",
    targetHref: "/admin/novels/night-watch-academy/chapters",
    reason: "nsfw",
    detail: "มีฉากรุนแรงเกินเรตที่ตั้งไว้ ควรติดป้ายเตือนก่อนเข้าอ่าน",
    reporter: "pim.reader",
    createdAt: "5 ชั่วโมงที่แล้ว",
    status: "reviewing",
    priority: "medium"
  },
  {
    id: "rpt-0005",
    targetType: "member",
    targetLabel: "ผู้ใช้ แฟนเงามืด (usr-0007)",
    targetHref: "/admin/users/usr-0007",
    reason: "abuse",
    detail: "ใช้ถ้อยคำหยาบคายกับทีมแปลต่อเนื่องหลายตอน มีผู้รายงาน 6 ครั้งในสัปดาห์นี้",
    reporter: "kittipong@niyainow.test",
    createdAt: "เมื่อวาน 22:10",
    status: "open",
    priority: "high"
  },
  {
    id: "rpt-0006",
    targetType: "chapter",
    targetLabel: "มุมมองนักอ่านพระเจ้า — ตอนที่ 8",
    targetHref: "/admin/novels/omniscient-reader/chapters",
    reason: "other",
    detail: "เนื้อหาตอนซ้ำกับตอนที่ 7 ทั้งตอน คาดว่าอัปโหลดผิดไฟล์",
    reporter: "bookworm.bkk",
    createdAt: "เมื่อวาน 15:02",
    status: "resolved",
    priority: "low"
  },
  {
    id: "rpt-0007",
    targetType: "comment",
    targetLabel: "คอมเมนต์ของ เรเวน — “ไอ้พวกที่มาสปอยล์ในคอมเมนต์…”",
    targetHref: "/admin/comments",
    reason: "abuse",
    detail: "ใช้คำรุนแรงกับผู้ใช้คนอื่น แม้เจตนาจะเป็นการตักเตือน",
    reporter: "fahsai",
    createdAt: "2 วันที่แล้ว",
    status: "dismissed",
    priority: "low"
  },
  {
    id: "rpt-0008",
    targetType: "novel",
    targetLabel: "สัญญาณหายกลางกรุง",
    targetHref: "/admin/novels/signal-lost-in-bangkok",
    reason: "spam",
    detail: "เรื่องย่อมีลิงก์ไปเว็บนอกที่ไม่เกี่ยวข้อง",
    reporter: "ระบบตรวจจับอัตโนมัติ",
    createdAt: "3 วันที่แล้ว",
    status: "resolved",
    priority: "low"
  },
  {
    id: "rpt-0009",
    targetType: "member",
    targetLabel: "ผู้ใช้ ทานากะสายไทย (usr-0020)",
    targetHref: "/admin/users/usr-0020",
    reason: "spam",
    detail: "สร้างบัญชีหลายใบเพื่อรับเหรียญโบนัสสมาชิกใหม่",
    reporter: "ระบบตรวจจับอัตโนมัติ",
    createdAt: "4 วันที่แล้ว",
    status: "open",
    priority: "medium"
  },
  {
    id: "rpt-0010",
    targetType: "chapter",
    targetLabel: "กระบี่เก้าสายน้ำ — ตอนที่ 3",
    targetHref: "/admin/novels/sword-of-nine-rivers/chapters",
    reason: "copyright",
    detail: "ผู้ใช้แจ้งว่าเนื้อหาคัดลอกจากเว็บแปลอื่นแบบคำต่อคำ",
    reporter: "chai_translate",
    createdAt: "สัปดาห์ที่แล้ว",
    status: "reviewing",
    priority: "high"
  }
];

/* ------------------------------------------------------------ ธุรกรรม */

const methods = ["truemoney", "promptpay", "card", "linepay"] as const;
const txStatuses = ["success", "success", "success", "success", "pending", "success", "failed", "refunded"] as const;
const packageCoins = [50, 120, 250, 500, 1000, 2000];

export const adminTransactions: AdminTransaction[] = Array.from({ length: 28 }, (_, index) => {
  const member = members[index % members.length];
  const noise = seeded(index + 71);
  const kind = index % 5 === 2 ? "spend" : index % 11 === 7 ? "refund" : "topup";
  const coins = kind === "spend" ? 15 * (1 + (index % 4)) : pick(packageCoins, index);

  return {
    id: `txn-${String(index + 1).padStart(5, "0")}`,
    reference: `NY26${String(80410 + index * 37)}`,
    memberId: member.id,
    memberName: member.displayName,
    kind,
    coins,
    amountTHB: kind === "spend" ? 0 : coins,
    method: pick(methods, index + Math.round(noise * 3)),
    status: kind === "refund" ? "refunded" : pick(txStatuses, index),
    createdAt: pick(relativeTimes, index)
  };
});

/* ------------------------------------------------- คำขอถอนรายได้ (payout) */

export const adminPayouts: AdminPayout[] = [
  {
    id: "pay-0001",
    team: "ทีมแปลจันทร์เสี้ยว",
    contact: "moonteam@translate.test",
    periodLabel: "ก.ค. 2026",
    coins: 184200,
    amountTHB: 92100,
    status: "pending",
    requestedAt: "2 ชั่วโมงที่แล้ว",
    bankMasked: "กสิกรไทย •••• 4471"
  },
  {
    id: "pay-0002",
    team: "ห้องแปลดาวเหนือ",
    contact: "north@translate.test",
    periodLabel: "ก.ค. 2026",
    coins: 96400,
    amountTHB: 48200,
    status: "pending",
    requestedAt: "เมื่อวาน 10:15",
    bankMasked: "ไทยพาณิชย์ •••• 9032"
  },
  {
    id: "pay-0003",
    team: "Studio Inkwell",
    contact: "hello@inkwell.test",
    periodLabel: "ก.ค. 2026",
    coins: 142800,
    amountTHB: 71400,
    status: "approved",
    requestedAt: "3 วันที่แล้ว",
    bankMasked: "กรุงเทพ •••• 1188"
  },
  {
    id: "pay-0004",
    team: "กลุ่มอักษรม่วง",
    contact: "purple@translate.test",
    periodLabel: "มิ.ย. 2026",
    coins: 63500,
    amountTHB: 31750,
    status: "paid",
    requestedAt: "14 พ.ค. 2026",
    bankMasked: "กรุงไทย •••• 7725"
  },
  {
    id: "pay-0005",
    team: "ทีมแปลสายฟ้า",
    contact: "thunder@translate.test",
    periodLabel: "มิ.ย. 2026",
    coins: 21800,
    amountTHB: 10900,
    status: "rejected",
    requestedAt: "30 มี.ค. 2026",
    bankMasked: "ทหารไทยธนชาต •••• 5540"
  },
  {
    id: "pay-0006",
    team: "NiyaiNow Translation",
    contact: "inhouse@niyainow.test",
    periodLabel: "ก.ค. 2026",
    coins: 233900,
    amountTHB: 116950,
    status: "paid",
    requestedAt: "12 ม.ค. 2026",
    bankMasked: "กสิกรไทย •••• 3301"
  }
];

/* ------------------------------------------------------------ ประกาศ */

export const adminAnnouncements: AdminAnnouncement[] = [
  {
    id: "ann-001",
    title: "ปิดปรับปรุงระบบเหรียญ 16 ส.ค. 02:00–04:00 น.",
    body: "ช่วงเวลาดังกล่าวจะเติมเหรียญและปลดล็อกตอนไม่ได้ชั่วคราว ตอนที่ปลดล็อกไว้แล้วยังอ่านได้ตามปกติ",
    channel: "banner",
    audience: "all",
    status: "scheduled",
    scheduledFor: "15 ส.ค. 2026 18:00 น.",
    reach: 0
  },
  {
    id: "ann-002",
    title: "แจกเหรียญ 50 เหรียญ ฉลองครบ 1 ล้านผู้อ่าน",
    body: "สมาชิกทุกคนที่เข้าใช้งานระหว่าง 14–20 ส.ค. รับเหรียญฟรีอัตโนมัติในหน้าเหรียญของฉัน",
    channel: "popup",
    audience: "readers",
    status: "sent",
    scheduledFor: "14 ส.ค. 2026 09:00 น.",
    reach: 184203
  },
  {
    id: "ann-003",
    title: "ตอนใหม่ของเรื่องที่คุณติดตามมาแล้ว",
    body: "แจ้งเตือนอัตโนมัติเมื่อเรื่องที่ติดตามมีตอนใหม่ ตั้งค่าปิดได้ในหน้าตั้งค่า",
    channel: "push",
    audience: "readers",
    status: "sent",
    scheduledFor: "13 ส.ค. 2026 20:00 น.",
    reach: 96412
  },
  {
    id: "ann-004",
    title: "เปิดรับสมัครทีมแปลรอบใหม่ ประจำไตรมาส 4",
    body: "ทีมแปลที่สนใจส่งพอร์ตงานได้ถึง 30 ก.ย. 2026 ส่วนแบ่งรายได้เริ่มต้น 50%",
    channel: "email",
    audience: "translators",
    status: "draft",
    scheduledFor: "ยังไม่ได้ตั้งเวลา",
    reach: 0
  },
  {
    id: "ann-005",
    title: "สิทธิพิเศษสำหรับสมาชิกที่เติมเหรียญเดือนนี้",
    body: "รับโบนัสเพิ่ม 10% ทุกแพ็กเกจตั้งแต่ 250 เหรียญขึ้นไป ถึงสิ้นเดือนนี้",
    channel: "email",
    audience: "paying",
    status: "scheduled",
    scheduledFor: "18 ส.ค. 2026 10:00 น.",
    reach: 0
  },
  {
    id: "ann-006",
    title: "อัปเดตนโยบายความเป็นส่วนตัว",
    body: "มีผลตั้งแต่ 1 ก.ย. 2026 อ่านสรุปการเปลี่ยนแปลงได้ในหน้านโยบาย",
    channel: "banner",
    audience: "all",
    status: "sent",
    scheduledFor: "02 ส.ค. 2026 12:00 น.",
    reach: 210884
  }
];

/* -------------------------------------------------------------- แบนเนอร์ */

const bannerSlots = ["hero", "hero", "featured-row", "sidebar", "popup", "featured-row"] as const;

export const adminBanners: AdminBanner[] = novels.slice(0, 6).map((novel, index) => {
  const noise = seeded(index + 101);
  return {
    id: `bnr-${String(index + 1).padStart(3, "0")}`,
    title: `โปรโมต: ${novel.thaiTitle}`,
    slot: pick(bannerSlots, index),
    novelSlug: novel.slug,
    image: novel.backdrop,
    active: index !== 4,
    startAt: pick(dateLabels, index + 2),
    endAt: pick(dateLabels, index),
    impressions: 40000 + Math.round(noise * 220000),
    clicks: 1200 + Math.round(noise * 14000),
    order: index + 1
  };
});

/* ------------------------------------------------------- บันทึกกิจกรรม */

export const adminActivities: AdminActivity[] = [
  {
    id: "act-001",
    actor: "ณัฐฐา ทองแท้",
    role: "admin",
    action: "approve",
    target: "คู่มือเอาตัวรอดฉบับนางร้าย",
    detail: "อนุมัติให้เผยแพร่ พร้อมตั้งเวลาโปรโมตหน้าแรก 7 วัน",
    at: "8 นาทีที่แล้ว"
  },
  {
    id: "act-002",
    actor: "อารียา พงศ์ไพศาล",
    role: "moderator",
    action: "delete",
    target: "คอมเมนต์ cmt-0004",
    detail: "ลบคอมเมนต์สแปมโฆษณารับแปลงาน และระงับผู้ใช้ 7 วัน",
    at: "25 นาทีที่แล้ว"
  },
  {
    id: "act-003",
    actor: "กิตติพงษ์ ใจดี",
    role: "editor",
    action: "update",
    target: "ฉันกลายเป็นราชาในโลกแห่งเงา — ตอนที่ 7",
    detail: "แก้คำผิด 12 จุด และปรับราคาเหรียญจาก 20 เป็น 15",
    at: "1 ชั่วโมงที่แล้ว"
  },
  {
    id: "act-004",
    actor: "ปิยะวัฒน์ ศรีสุข",
    role: "owner",
    action: "payout",
    target: "Studio Inkwell",
    detail: "อนุมัติคำขอถอนรายได้ 71,400 บาท รอบเดือน ก.ค. 2026",
    at: "2 ชั่วโมงที่แล้ว"
  },
  {
    id: "act-005",
    actor: "ณัฐฐา ทองแท้",
    role: "admin",
    action: "create",
    target: "ประกาศ ann-001",
    detail: "สร้างประกาศปิดปรับปรุงระบบเหรียญ ตั้งเวลาส่ง 15 ส.ค. 18:00 น.",
    at: "3 ชั่วโมงที่แล้ว"
  },
  {
    id: "act-006",
    actor: "อารียา พงศ์ไพศาล",
    role: "moderator",
    action: "reject",
    target: "เจ็ดวันแห่งสายฝน",
    detail: "ปฏิเสธการส่งเข้าระบบ เหตุผล: งานแปลยังไม่ผ่านการพิสูจน์อักษร",
    at: "เมื่อวาน 19:30"
  },
  {
    id: "act-007",
    actor: "กิตติพงษ์ ใจดี",
    role: "editor",
    action: "create",
    target: "ราชันอมตะผงาดฟ้า — ตอนที่ 313",
    detail: "อัปโหลดตอนใหม่ ตั้งเวลาเผยแพร่ 20:00 น.",
    at: "เมื่อวาน 16:45"
  },
  {
    id: "act-008",
    actor: "ธนกฤต วัฒนชัย",
    role: "support",
    action: "update",
    target: "ผู้ใช้ usr-0011",
    detail: "คืนเหรียญ 45 เหรียญจากกรณีตอนเปิดไม่ได้",
    at: "2 วันที่แล้ว"
  },
  {
    id: "act-009",
    actor: "ปิยะวัฒน์ ศรีสุข",
    role: "owner",
    action: "login",
    target: "ระบบหลังบ้าน",
    detail: "เข้าสู่ระบบจาก IP 203.150.•••.•••",
    at: "2 วันที่แล้ว"
  },
  {
    id: "act-010",
    actor: "ณัฐฐา ทองแท้",
    role: "admin",
    action: "update",
    target: "แพ็กเกจเหรียญ pro",
    detail: "ปรับโบนัสจาก 60 เป็น 80 เหรียญ และตั้งเป็นแพ็กเกจแนะนำ",
    at: "3 วันที่แล้ว"
  },
  {
    id: "act-011",
    actor: "อารียา พงศ์ไพศาล",
    role: "moderator",
    action: "approve",
    target: "รายงาน rpt-0006",
    detail: "ปิดรายงาน หลังทีมแก้ไฟล์ตอนที่อัปโหลดผิดเรียบร้อย",
    at: "3 วันที่แล้ว"
  },
  {
    id: "act-012",
    actor: "กิตติพงษ์ ใจดี",
    role: "editor",
    action: "delete",
    target: "แบนเนอร์ bnr-005",
    detail: "ปิดแบนเนอร์ป๊อปอัปหลังแคมเปญจบ",
    at: "สัปดาห์ที่แล้ว"
  }
];

/* ---------------------------------------------------------- ชุดข้อมูลกราฟ */

/** ผู้อ่านรายวัน 14 วันล่าสุด (หน่วย: คน) */
export const dailyReaders: SeriesPoint[] = [
  { label: "1 ส.ค.", value: 42100 },
  { label: "2 ส.ค.", value: 45300 },
  { label: "3 ส.ค.", value: 51800 },
  { label: "4 ส.ค.", value: 47200 },
  { label: "5 ส.ค.", value: 46400 },
  { label: "6 ส.ค.", value: 49900 },
  { label: "7 ส.ค.", value: 53600 },
  { label: "8 ส.ค.", value: 58200 },
  { label: "9 ส.ค.", value: 61400 },
  { label: "10 ส.ค.", value: 57700 },
  { label: "11 ส.ค.", value: 55100 },
  { label: "12 ส.ค.", value: 59800 },
  { label: "13 ส.ค.", value: 64300 },
  { label: "14 ส.ค.", value: 68900 }
];

/** รายได้รายเดือน (หน่วย: บาท) */
export const monthlyRevenue: SeriesPoint[] = [
  { label: "ก.ย.", value: 612000 },
  { label: "ต.ค.", value: 668000 },
  { label: "พ.ย.", value: 704000 },
  { label: "ธ.ค.", value: 892000 },
  { label: "ม.ค.", value: 815000 },
  { label: "ก.พ.", value: 776000 },
  { label: "มี.ค.", value: 840000 },
  { label: "เม.ย.", value: 903000 },
  { label: "พ.ค.", value: 958000 },
  { label: "มิ.ย.", value: 1024000 },
  { label: "ก.ค.", value: 1136000 },
  { label: "ส.ค.", value: 1248000 }
];

/** สัดส่วนการอ่านตามแนว (หน่วย: % ของยอดอ่านทั้งหมด) */
export const genreShare: SeriesPoint[] = [
  { label: "แฟนตาซี", value: 24 },
  { label: "ระบบ", value: 19 },
  { label: "โรแมนซ์", value: 16 },
  { label: "แอ็กชัน", value: 13 },
  { label: "เซียน", value: 11 },
  { label: "สืบสวน", value: 9 },
  { label: "อื่น ๆ", value: 8 }
];

/** ช่วงเวลาที่มีคนอ่านมากที่สุดในหนึ่งวัน (หน่วย: พันครั้ง) */
export const hourlyTraffic: SeriesPoint[] = [
  { label: "00", value: 18 },
  { label: "03", value: 7 },
  { label: "06", value: 11 },
  { label: "09", value: 24 },
  { label: "12", value: 38 },
  { label: "15", value: 33 },
  { label: "18", value: 46 },
  { label: "21", value: 62 }
];

/** อัตราคงอยู่ของผู้ใช้ใหม่ (หน่วย: %) */
export const retentionCurve: SeriesPoint[] = [
  { label: "D1", value: 100 },
  { label: "D3", value: 68 },
  { label: "D7", value: 51 },
  { label: "D14", value: 39 },
  { label: "D30", value: 31 },
  { label: "D60", value: 26 },
  { label: "D90", value: 23 }
];
