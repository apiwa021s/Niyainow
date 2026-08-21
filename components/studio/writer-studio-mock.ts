export type FanFilter = "all" | "followers" | "members";
export type StoryState = "writing" | "completed" | "draft" | "paused";
export type PostVisibility = "public" | "followers" | "members";

export const writerProfile = {
  name: "Luna",
  username: "@luna",
  url: "novelnow.com/@luna",
  bio: "ชอบเขียนความสัมพันธ์ที่ไม่ควรเกิดขึ้น\nDark Romance • BL • Omegaverse\nอัปเดตทุกวันศุกร์ ✦",
  avatar: "L",
  emailMasked: "lu•••@gmail.com",
  followerCount: 12842,
  storyCount: 4,
  readCount: 3200000,
};

export const fanKpis = {
  totalFollowers: 12842,
  newFollowersThisMonth: 1284,
  members: 346,
  returnRate: 68,
};

export const fanGrowth = {
  followers: {
    7: [28, 36, 42, 40, 44, 49, 52],
    30: [18, 21, 25, 22, 26, 30, 29, 31, 34, 33, 36, 38, 35, 39, 42, 44, 43, 46, 48, 50, 52, 49, 53, 56, 58, 59, 61, 63, 65, 68],
    90: [8, 9, 9, 10, 10, 11, 12, 12, 13, 13, 14, 15, 15, 16, 17, 17, 18, 18, 19, 20, 21, 21, 22, 22, 23, 24, 24, 25, 26, 27, 27, 28, 28, 29, 30, 30, 31, 32, 32, 33, 33, 34, 35, 35, 36, 37, 38, 38, 39, 40, 41, 41, 42, 43, 43, 44, 45, 45, 46, 47, 48, 49, 49, 50, 51, 52, 52, 53, 54, 55, 56, 56, 57, 58, 59, 60, 61, 61, 62, 63, 64, 64, 65, 66, 67, 67, 68, 69, 70, 71],
  },
  members: {
    7: [6, 8, 7, 9, 10, 12, 11],
    30: [2, 3, 4, 4, 5, 5, 6, 7, 6, 8, 8, 9, 10, 9, 10, 11, 12, 12, 13, 13, 14, 13, 15, 16, 16, 17, 17, 18, 19, 20],
    90: [0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 12, 13, 13, 13, 14, 14, 14, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 21, 21, 21, 22, 22, 22, 22, 23, 23, 23, 24, 24, 24, 25, 25, 25, 25, 26, 26, 26],
  },
};

export const fanSource = [
  { label: "หน้ารายละเอียดเรื่อง", value: 42 },
  { label: "Discover", value: 26 },
  { label: "คำแนะนำสำหรับคุณ", value: 18 },
  { label: "Profile", value: 8 },
  { label: "การแชร์", value: 6 },
];

export const fanPreferences = [
  { label: "Dark Romance", value: 74 },
  { label: "BL", value: 62 },
  { label: "Omegaverse", value: 48 },
  { label: "คลั่งรัก", value: 41 },
  { label: "Enemies to Lovers", value: 36 },
];

export const intensityPreference = [
  { level: 3, value: 18 },
  { level: 4, value: 52 },
  { level: 5, value: 30 },
];

export const latestFans = [
  { id: "f1", name: "NightReader", initial: "N", monthsFollow: 4, storiesRead: 3, isMember: false, memberMonths: 0 },
  { id: "f2", name: "PinkMoon ✦", initial: "P", monthsFollow: 12, storiesRead: 4, isMember: true, memberMonths: 6 },
  { id: "f3", name: "MoonArchive", initial: "M", monthsFollow: 8, storiesRead: 2, isMember: false, memberMonths: 0 },
  { id: "f4", name: "VioletInk", initial: "V", monthsFollow: 10, storiesRead: 4, isMember: true, memberMonths: 4 },
  { id: "f5", name: "KeenEyes", initial: "K", monthsFollow: 2, storiesRead: 1, isMember: false, memberMonths: 0 },
];

export const postsSeed = [
  {
    id: "p1",
    title: "EP.32 กำลังมาแล้วนะ ✦",
    body: "คืนนี้ 20:00 เจอกัน",
    status: "published" as const,
    age: "2 ชั่วโมงที่แล้ว",
    likes: 842,
    comments: 126,
    visibility: "public" as PostVisibility,
    image: true,
  },
  {
    id: "p2",
    title: "คืนนี้มี Q&A สั้น ๆ",
    body: "แวะมาคุยกันที่โพสต์นี้ได้เลย",
    status: "draft" as const,
    age: "ฉบับร่างล่าสุดเมื่อวาน",
    likes: 0,
    comments: 0,
    visibility: "followers" as PostVisibility,
    image: false,
  },
  {
    id: "p3",
    title: "พรุ่งนี้มีตอนพิเศษสำหรับสมาชิก",
    body: "Bonus chapter จะลงตอน 21:00",
    status: "scheduled" as const,
    age: "ตั้งเวลา 22 ส.ค. 21:00",
    likes: 0,
    comments: 0,
    visibility: "members" as PostVisibility,
    image: false,
  },
];

export const membershipPlans = [39, 59, 99, 149] as const;

export const membershipBenefits = [
  { id: "early", title: "อ่านตอนใหม่ก่อนใคร", description: "สมาชิกเห็นตอนใหม่ก่อน Public ตามจำนวนตอนที่คุณตั้งไว้" },
  { id: "bonus", title: "ตอนพิเศษสำหรับสมาชิก", description: "สร้าง Bonus chapter เฉพาะสมาชิกเท่านั้น" },
  { id: "member-post", title: "โพสต์สมาชิก", description: "พูดคุยเบื้องหลังหรืออัปเดตเฉพาะสมาชิกได้" },
  { id: "badge", title: "Member Badge", description: "สมาชิกจะมี Badge เล็ก ๆ ใต้ชื่อเมื่อคอมเมนต์" },
];

export const defaultMembership = {
  enabled: false,
  name: "Luna After Dark",
  description: "ขอบคุณที่สนับสนุนงานของฉัน\nสมาชิกจะได้อ่านตอนใหม่ก่อนใคร\nและเข้าถึงเนื้อหาพิเศษ ✦",
  price: 59,
  selectedBenefits: ["early", "bonus", "member-post", "badge"],
  currentMembers: 346,
  newMembersMonth: 42,
  monthlyRevenue: 18420,
  renewalRate: 82,
  growth7: [3, 4, 6, 5, 7, 8, 9],
  growth30: [1, 1, 2, 2, 3, 3, 4, 5, 4, 6, 6, 7, 8, 8, 9, 10, 9, 10, 11, 11, 12, 13, 12, 13, 14, 14, 15, 16, 16, 17],
  growth90: [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 12, 13, 13, 13, 14, 14, 14, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 20, 20, 20, 21, 21, 21, 21, 22, 22, 22, 23, 23, 23, 24, 24, 24, 24, 25, 25, 25, 26, 26],
  earlyAccessChapters: 3,
  earlyAccessPolicy: "normal" as "normal" | "free",
  latestPublicEpisode: "EP.20",
  latestMemberEpisode: "EP.23",
};

export const writerGenres = ["Dark Romance", "Romance", "BL", "GL", "Fantasy", "Omegaverse", "Mafia"];

export const stories = [
  {
    slug: "reborn-as-a-warlord",
    title: "รักที่ไม่ควรถูกเปิดเผย",
    genre: "ดาร์กโรแมนซ์ • BL",
    state: "writing" as StoryState,
    chapters: 38,
    reads: 1200000,
    monthlyRevenue: 8420,
    updatedAt: "2 ชั่วโมงที่แล้ว",
    latestEp: "EP.38",
    draftTitle: "EP.39 — สิ่งที่เขาไม่ควรพูด",
    draftWords: 2842,
    earlyAccessChapters: 3,
  },
  {
    slug: "alchemy-empress",
    title: "Dangerous Love",
    genre: "Romance • Mafia",
    state: "writing" as StoryState,
    chapters: 17,
    reads: 640000,
    monthlyRevenue: 3920,
    updatedAt: "เมื่อวาน",
    latestEp: "EP.17",
    draftTitle: "",
    draftWords: 0,
    earlyAccessChapters: 0,
  },
  {
    slug: "system-of-a-thousand-lives",
    title: "คืนที่ห้ามใจไม่ไหว",
    genre: "Omegaverse • BL",
    state: "paused" as StoryState,
    chapters: 24,
    reads: 360000,
    monthlyRevenue: 2140,
    updatedAt: "3 วันที่แล้ว",
    latestEp: "EP.24",
    draftTitle: "",
    draftWords: 0,
    earlyAccessChapters: 0,
  },
  {
    slug: "quiet-city-diary",
    title: "บทสุดท้ายของฤดูหนาว",
    genre: "Romance",
    state: "draft" as StoryState,
    chapters: 0,
    reads: 0,
    monthlyRevenue: 0,
    updatedAt: "1 สัปดาห์ที่แล้ว",
    latestEp: "-",
    draftTitle: "โครงเรื่องบทนำ",
    draftWords: 1130,
    earlyAccessChapters: 0,
  },
];

export const storySorts = ["อัปเดตล่าสุด", "ยอดอ่านสูงสุด", "รายได้สูงสุด", "ชื่อเรื่อง"] as const;

export const notificationItems = [
  { id: "n1", category: "ผลงาน", title: "EP.38 เผยแพร่แล้ว", detail: "เมื่อ 2 ชั่วโมงที่แล้ว", day: "วันนี้" },
  { id: "n2", category: "Membership", title: "Luna After Dark", detail: "มีสมาชิกใหม่ 18 คนในสัปดาห์นี้", day: "วันนี้" },
  { id: "n3", category: "แฟน", title: "รักที่ไม่ควรถูกเปิดเผย", detail: "มีผู้ติดตามเพิ่ม 142 คน", day: "วันนี้" },
  { id: "n4", category: "รายได้", title: "รายได้สัปดาห์นี้เพิ่มขึ้น", detail: "รายได้เพิ่ม 14% เทียบสัปดาห์ก่อน", day: "เมื่อวาน" },
  { id: "n5", category: "แฟน", title: "มีผู้ติดตามใหม่ 42 คนวันนี้", detail: "สรุปแบบรวมรายวัน", day: "วันนี้" },
];

export const fanSourceInsight = "Dark Romance เป็นหมวดที่พาคนอ่านใหม่เข้ามาที่โปรไฟล์ของคุณมากที่สุด";

export const whole = new Intl.NumberFormat("th-TH");
export const compact = new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 });
export const money = new Intl.NumberFormat("th-TH");
