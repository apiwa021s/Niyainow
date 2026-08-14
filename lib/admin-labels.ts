import type {
  ActivityAction,
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementStatus,
  BannerSlot,
  CommentStatus,
  MemberRole,
  MemberStatus,
  PaymentMethod,
  PayoutStatus,
  PublishStatus,
  ReportPriority,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  StaffRole,
  StaffStatus,
  TransactionKind,
  TransactionStatus
} from "@/types/admin";

/* =========================================================================
   ป้ายกำกับภาษาไทยของทุกสถานะในหลังบ้าน + โทนสีของ pill
   รวมไว้ที่เดียวเพราะทั้งหน้า server และ component ฝั่ง client ใช้ชุดเดียวกัน
   โทนสีต้องมาคู่กับ "ข้อความ" เสมอ ห้ามสื่อความหมายด้วยสีอย่างเดียว (ส่วนที่ 8)
   ========================================================================= */

export type PillTone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

type Meta<T extends string> = Record<T, { label: string; tone: PillTone }>;

export const PUBLISH_STATUS: Meta<PublishStatus> = {
  published: { label: "เผยแพร่แล้ว", tone: "success" },
  scheduled: { label: "ตั้งเวลาไว้", tone: "info" },
  draft: { label: "ฉบับร่าง", tone: "neutral" },
  review: { label: "รอตรวจ", tone: "warning" },
  rejected: { label: "ถูกปฏิเสธ", tone: "danger" }
};

export const STAFF_ROLE: Meta<StaffRole> = {
  owner: { label: "เจ้าของระบบ", tone: "brand" },
  admin: { label: "ผู้ดูแลระบบ", tone: "info" },
  editor: { label: "บรรณาธิการ", tone: "success" },
  moderator: { label: "ผู้ตรวจเนื้อหา", tone: "warning" },
  support: { label: "ฝ่ายสนับสนุน", tone: "neutral" }
};

export const STAFF_STATUS: Meta<StaffStatus> = {
  active: { label: "ใช้งานอยู่", tone: "success" },
  invited: { label: "รอตอบรับคำเชิญ", tone: "info" },
  suspended: { label: "ระงับชั่วคราว", tone: "danger" }
};

export const MEMBER_STATUS: Meta<MemberStatus> = {
  active: { label: "ปกติ", tone: "success" },
  suspended: { label: "ระงับชั่วคราว", tone: "warning" },
  banned: { label: "แบนถาวร", tone: "danger" }
};

export const MEMBER_ROLE: Meta<MemberRole> = {
  reader: { label: "นักอ่าน", tone: "neutral" },
  author: { label: "นักเขียน", tone: "brand" },
  translator: { label: "นักแปล", tone: "info" }
};

export const COMMENT_STATUS: Meta<CommentStatus> = {
  visible: { label: "แสดงอยู่", tone: "success" },
  pending: { label: "รอตรวจ", tone: "warning" },
  hidden: { label: "ซ่อนแล้ว", tone: "neutral" },
  spam: { label: "สแปม", tone: "danger" }
};

export const REPORT_STATUS: Meta<ReportStatus> = {
  open: { label: "ยังไม่ตรวจ", tone: "danger" },
  reviewing: { label: "กำลังตรวจ", tone: "warning" },
  resolved: { label: "จัดการแล้ว", tone: "success" },
  dismissed: { label: "ไม่มีมูล", tone: "neutral" }
};

export const REPORT_REASON: Meta<ReportReason> = {
  spam: { label: "สแปม/โฆษณา", tone: "warning" },
  abuse: { label: "คุกคาม/หยาบคาย", tone: "danger" },
  spoiler: { label: "สปอยล์", tone: "info" },
  copyright: { label: "ละเมิดลิขสิทธิ์", tone: "danger" },
  nsfw: { label: "เนื้อหาไม่เหมาะสม", tone: "warning" },
  other: { label: "อื่น ๆ", tone: "neutral" }
};

export const REPORT_PRIORITY: Meta<ReportPriority> = {
  high: { label: "ด่วนมาก", tone: "danger" },
  medium: { label: "ปานกลาง", tone: "warning" },
  low: { label: "ไม่ด่วน", tone: "neutral" }
};

export const REPORT_TARGET: Record<ReportTargetType, string> = {
  novel: "นิยาย",
  chapter: "ตอน",
  comment: "คอมเมนต์",
  member: "ผู้ใช้"
};

export const TRANSACTION_KIND: Meta<TransactionKind> = {
  topup: { label: "เติมเหรียญ", tone: "success" },
  spend: { label: "ใช้เหรียญ", tone: "info" },
  refund: { label: "คืนเงิน", tone: "warning" }
};

export const TRANSACTION_STATUS: Meta<TransactionStatus> = {
  success: { label: "สำเร็จ", tone: "success" },
  pending: { label: "รอดำเนินการ", tone: "warning" },
  failed: { label: "ล้มเหลว", tone: "danger" },
  refunded: { label: "คืนเงินแล้ว", tone: "neutral" }
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  truemoney: "TrueMoney Wallet",
  promptpay: "PromptPay QR",
  card: "บัตรเครดิต/เดบิต",
  linepay: "Rabbit LINE Pay"
};

export const PAYOUT_STATUS: Meta<PayoutStatus> = {
  pending: { label: "รออนุมัติ", tone: "warning" },
  approved: { label: "อนุมัติแล้ว", tone: "info" },
  paid: { label: "โอนแล้ว", tone: "success" },
  rejected: { label: "ปฏิเสธ", tone: "danger" }
};

export const ANNOUNCEMENT_STATUS: Meta<AnnouncementStatus> = {
  draft: { label: "ฉบับร่าง", tone: "neutral" },
  scheduled: { label: "ตั้งเวลาไว้", tone: "info" },
  sent: { label: "ส่งแล้ว", tone: "success" }
};

export const ANNOUNCEMENT_CHANNEL: Record<AnnouncementChannel, string> = {
  banner: "แถบประกาศบนเว็บ",
  popup: "ป๊อปอัปหน้าแรก",
  push: "แจ้งเตือนบนมือถือ",
  email: "อีเมล"
};

export const ANNOUNCEMENT_AUDIENCE: Record<AnnouncementAudience, string> = {
  all: "ทุกคน",
  readers: "นักอ่านทั้งหมด",
  paying: "สมาชิกที่เคยเติมเหรียญ",
  translators: "ทีมแปล"
};

export const BANNER_SLOT: Record<BannerSlot, string> = {
  hero: "แบนเนอร์ใหญ่หน้าแรก",
  "featured-row": "แถวแนะนำ",
  sidebar: "แถบข้าง",
  popup: "ป๊อปอัป"
};

export const ACTIVITY_ACTION: Meta<ActivityAction> = {
  create: { label: "สร้าง", tone: "success" },
  update: { label: "แก้ไข", tone: "info" },
  delete: { label: "ลบ", tone: "danger" },
  approve: { label: "อนุมัติ", tone: "success" },
  reject: { label: "ปฏิเสธ", tone: "danger" },
  login: { label: "เข้าสู่ระบบ", tone: "neutral" },
  payout: { label: "จ่ายเงิน", tone: "brand" }
};

/** สิ่งที่แต่ละบทบาททำได้ — ใช้ทั้งหน้าทีมงานและหน้าตั้งค่าสิทธิ์ */
export const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  owner: ["จัดการทุกอย่าง", "ตั้งค่าระบบ", "อนุมัติการถอนเงิน", "เพิ่ม/ลบทีมงาน"],
  admin: ["จัดการนิยายและตอน", "จัดการสมาชิก", "ดูรายงานการเงิน", "ส่งประกาศ"],
  editor: ["เพิ่ม/แก้ไขนิยายและตอน", "ตั้งเวลาเผยแพร่", "จัดการแนวและแท็ก"],
  moderator: ["ตรวจคอมเมนต์และรายงาน", "ระงับผู้ใช้ชั่วคราว", "ซ่อนเนื้อหา"],
  support: ["ดูข้อมูลสมาชิก", "คืนเหรียญให้ผู้ใช้", "ตอบเรื่องร้องเรียน"]
};
