import type { Novel } from "@/types/novel";

/* =========================================================================
   Admin — โครงข้อมูลฝั่งหลังบ้าน
   ยังเป็น mock ทั้งหมดเหมือนฝั่งผู้อ่าน (ดู data/admin-data.ts)
   ========================================================================= */

/** สิทธิ์ของทีมงาน — เรียงจากสูงไปต่ำ ใช้กำหนดว่าเห็น/แก้อะไรได้บ้าง */
export type StaffRole = "owner" | "admin" | "editor" | "moderator" | "support";

export type StaffStatus = "active" | "invited" | "suspended";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  lastActive: string;
  /** จำนวนงานที่ทำในระบบเดือนนี้ — ใช้โชว์ในตารางทีมงาน */
  actionsThisMonth: number;
};

/**
 * สถานะการเผยแพร่ในระบบหลังบ้าน
 * คนละเรื่องกับ NovelStatus (ongoing/completed/hiatus) ซึ่งคือ "สถานะการแปล"
 */
export type PublishStatus = "published" | "draft" | "scheduled" | "review" | "rejected";

/** แถวนิยายในตารางหลังบ้าน = ข้อมูลฝั่งผู้อ่าน + ฟิลด์ที่มีเฉพาะแอดมิน */
export type AdminNovel = Novel & {
  publishStatus: PublishStatus;
  /** ทีมที่ดูแลเรื่องนี้ */
  owner: string;
  /** จำนวนรายงานที่ยังไม่ปิดของเรื่องนี้ */
  reports: number;
  revenueTHB: number;
  viewsThisWeek: number;
  publishedAt: string;
  /** ตอนที่ตั้งเวลาไว้แต่ยังไม่ถึงคิว */
  scheduledChapters: number;
};

export type AdminChapter = {
  id: string;
  novelSlug: string;
  novelTitle: string;
  number: number;
  title: string;
  publishStatus: PublishStatus;
  /** จำนวนคำโดยประมาณ — ใช้เช็กว่าตอนสั้นผิดปกติไหม */
  words: number;
  locked: boolean;
  coinPrice: number;
  views: number;
  comments: number;
  updatedAt: string;
  /** เวลาเผยแพร่ที่ตั้งไว้ (เฉพาะ publishStatus = scheduled) */
  scheduledFor?: string;
  editor: string;
};

/** นิยายที่นักเขียน/ทีมแปลส่งเข้ามารออนุมัติ */
export type NovelSubmission = {
  id: string;
  title: string;
  thaiTitle: string;
  author: string;
  submittedBy: string;
  genres: string[];
  synopsis: string;
  cover: string;
  chapters: number;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  /** เหตุผลที่ปฏิเสธ — บังคับกรอกตอนกดปฏิเสธ */
  note?: string;
};

export type MemberStatus = "active" | "suspended" | "banned";
export type MemberRole = "reader" | "author" | "translator";

export type Member = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  lastActive: string;
  coins: number;
  spentTHB: number;
  chaptersRead: number;
  follows: number;
  /** ยืนยันอีเมลแล้วหรือยัง */
  verified: boolean;
  /** จำนวนครั้งที่ถูกรายงาน */
  reports: number;
};

export type CommentStatus = "visible" | "pending" | "hidden" | "spam";

export type AdminComment = {
  id: string;
  memberId: string;
  author: string;
  novelSlug: string;
  novelTitle: string;
  chapter: number;
  body: string;
  createdAt: string;
  status: CommentStatus;
  likes: number;
  reports: number;
};

export type ReportReason = "spam" | "abuse" | "spoiler" | "copyright" | "nsfw" | "other";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportPriority = "high" | "medium" | "low";
export type ReportTargetType = "novel" | "chapter" | "comment" | "member";

export type AdminReport = {
  id: string;
  targetType: ReportTargetType;
  targetLabel: string;
  /** ลิงก์ไปหน้าที่เกี่ยวข้องในหลังบ้าน — ผู้ตรวจต้องกดดูของจริงได้ทันที */
  targetHref: string;
  reason: ReportReason;
  detail: string;
  reporter: string;
  createdAt: string;
  status: ReportStatus;
  priority: ReportPriority;
};

export type TransactionKind = "topup" | "spend" | "refund";
export type PaymentMethod = "truemoney" | "promptpay" | "card" | "linepay";
export type TransactionStatus = "success" | "pending" | "failed" | "refunded";

export type AdminTransaction = {
  id: string;
  reference: string;
  memberId: string;
  memberName: string;
  kind: TransactionKind;
  coins: number;
  amountTHB: number;
  method: PaymentMethod;
  status: TransactionStatus;
  createdAt: string;
};

export type PayoutStatus = "pending" | "approved" | "paid" | "rejected";

/** คำขอถอนรายได้ของทีมแปล */
export type AdminPayout = {
  id: string;
  team: string;
  contact: string;
  periodLabel: string;
  coins: number;
  amountTHB: number;
  status: PayoutStatus;
  requestedAt: string;
  /** เลขบัญชีปิดบางส่วน — ห้ามเก็บ/แสดงเต็มในหน้าจอ */
  bankMasked: string;
};

export type AnnouncementChannel = "banner" | "popup" | "push" | "email";
export type AnnouncementStatus = "draft" | "scheduled" | "sent";
export type AnnouncementAudience = "all" | "readers" | "paying" | "translators";

export type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  channel: AnnouncementChannel;
  audience: AnnouncementAudience;
  status: AnnouncementStatus;
  scheduledFor: string;
  /** จำนวนคนที่ได้รับจริง (เฉพาะที่ส่งแล้ว) */
  reach: number;
};

export type BannerSlot = "hero" | "featured-row" | "sidebar" | "popup";

export type AdminBanner = {
  id: string;
  title: string;
  slot: BannerSlot;
  novelSlug: string;
  image: string;
  active: boolean;
  startAt: string;
  endAt: string;
  impressions: number;
  clicks: number;
  order: number;
};

export type ActivityAction = "create" | "update" | "delete" | "approve" | "reject" | "login" | "payout";

export type AdminActivity = {
  id: string;
  actor: string;
  role: StaffRole;
  action: ActivityAction;
  target: string;
  detail: string;
  at: string;
};

/** จุดข้อมูลของกราฟ — label ใช้เป็นแกน X ตรง ๆ */
export type SeriesPoint = {
  label: string;
  value: number;
};

/** ตัวเลขสรุปบนการ์ด KPI */
export type KpiStat = {
  id: string;
  label: string;
  value: number;
  /** เปอร์เซ็นต์เทียบช่วงก่อนหน้า (ติดลบได้) */
  delta: number;
  unit?: string;
  hint: string;
};
