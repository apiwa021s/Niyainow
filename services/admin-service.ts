import {
  adminActivities,
  adminAnnouncements,
  adminBanners,
  adminChapters,
  adminComments,
  adminNovels,
  adminPayouts,
  adminReports,
  adminTransactions,
  dailyReaders,
  members,
  monthlyRevenue,
  novelSubmissions,
  staffMembers
} from "@/data/admin-data";
import type {
  AdminChapter,
  AdminComment,
  AdminNovel,
  AdminReport,
  AdminTransaction,
  CommentStatus,
  KpiStat,
  Member,
  MemberRole,
  MemberStatus,
  PublishStatus,
  SeriesPoint,
  TransactionKind,
  TransactionStatus
} from "@/types/admin";

/* =========================================================================
   Admin service — ชั้นเดียวกับ novel-service แต่สำหรับข้อมูลหลังบ้าน
   ทุกฟังก์ชันรับ query ที่มาจาก URL ได้ตรง ๆ เพื่อให้ตัวกรองแชร์ลิงก์ได้
   ========================================================================= */

const includes = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.toLowerCase());

/** ค่าที่แปลว่า "ไม่กรอง" — ทั้งตอนที่ยังไม่ได้เลือก และตอนเลือก "ทั้งหมด" */
const isAll = (value?: string) => !value || value === "all";

/* ----------------------------------------------------------------- นิยาย */

export type AdminNovelSort = "updated" | "views" | "revenue" | "chapters" | "title";

export type AdminNovelQuery = {
  q?: string;
  status?: PublishStatus | "all";
  genre?: string;
  sort?: AdminNovelSort;
};

export function getAdminNovels(query: AdminNovelQuery = {}): AdminNovel[] {
  const filtered = adminNovels
    .filter((novel) => isAll(query.status) || novel.publishStatus === query.status)
    .filter((novel) => isAll(query.genre) || novel.genres.includes(query.genre as string))
    .filter(
      (novel) =>
        !query.q ||
        [novel.thaiTitle, novel.title, novel.author, novel.owner, novel.slug].some((field) => includes(field, query.q as string))
    );

  return [...filtered].sort((a, b) => {
    if (query.sort === "views") return b.views - a.views;
    if (query.sort === "revenue") return b.revenueTHB - a.revenueTHB;
    if (query.sort === "chapters") return b.chapters - a.chapters;
    if (query.sort === "title") return a.thaiTitle.localeCompare(b.thaiTitle, "th");
    return (a.updatedHoursAgo ?? 1e9) - (b.updatedHoursAgo ?? 1e9);
  });
}

export function getAdminNovel(slug: string) {
  return adminNovels.find((novel) => novel.slug === slug);
}

/** จำนวนนิยายแยกตามสถานะ — ใช้ทำตัวเลขในวงเล็บบนแท็บตัวกรอง */
export function getNovelStatusCounts() {
  return adminNovels.reduce<Record<string, number>>((counts, novel) => {
    counts[novel.publishStatus] = (counts[novel.publishStatus] ?? 0) + 1;
    return counts;
  }, {});
}

/* ------------------------------------------------------------------ ตอน */

export type AdminChapterQuery = {
  q?: string;
  novel?: string;
  status?: PublishStatus | "all";
  access?: "free" | "paid" | "all";
};

export function getAdminChapters(query: AdminChapterQuery = {}): AdminChapter[] {
  return adminChapters
    .filter((chapter) => isAll(query.novel) || chapter.novelSlug === query.novel)
    .filter((chapter) => isAll(query.status) || chapter.publishStatus === query.status)
    .filter((chapter) => isAll(query.access) || (query.access === "paid" ? chapter.locked : !chapter.locked))
    .filter(
      (chapter) =>
        !query.q || [chapter.title, chapter.novelTitle, String(chapter.number)].some((field) => includes(field, query.q as string))
    );
}

export function getAdminChapter(novelSlug: string, number: number) {
  return adminChapters.find((chapter) => chapter.novelSlug === novelSlug && chapter.number === number);
}

/** ตอนที่ตั้งเวลาไว้ เรียงตามคิวที่จะขึ้นก่อน — ใช้บน dashboard */
export function getScheduledChapters(limit = 6) {
  return adminChapters.filter((chapter) => chapter.publishStatus === "scheduled").slice(0, limit);
}

/* ------------------------------------------------------- นิยายรออนุมัติ */

export function getSubmissions(status?: string) {
  return isAll(status) ? novelSubmissions : novelSubmissions.filter((item) => item.status === status);
}

export function getPendingSubmissionCount() {
  return novelSubmissions.filter((item) => item.status === "pending").length;
}

/* --------------------------------------------------------------- สมาชิก */

export type MemberQuery = {
  q?: string;
  status?: MemberStatus | "all";
  role?: MemberRole | "all";
  sort?: "recent" | "spent" | "read" | "name";
};

export function getMembers(query: MemberQuery = {}): Member[] {
  const filtered = members
    .filter((member) => isAll(query.status) || member.status === query.status)
    .filter((member) => isAll(query.role) || member.role === query.role)
    .filter(
      (member) =>
        !query.q ||
        [member.username, member.displayName, member.email, member.id].some((field) => includes(field, query.q as string))
    );

  return [...filtered].sort((a, b) => {
    if (query.sort === "spent") return b.spentTHB - a.spentTHB;
    if (query.sort === "read") return b.chaptersRead - a.chaptersRead;
    if (query.sort === "name") return a.displayName.localeCompare(b.displayName, "th");
    return 0;
  });
}

export function getMember(id: string) {
  return members.find((member) => member.id === id);
}

export function getStaff() {
  return staffMembers;
}

/* ------------------------------------------------------------ คอมเมนต์ */

export type CommentQuery = {
  q?: string;
  status?: CommentStatus | "all";
  /** true = เอาเฉพาะที่มีคนรายงาน */
  reported?: boolean;
};

export function getAdminComments(query: CommentQuery = {}): AdminComment[] {
  return adminComments
    .filter((comment) => isAll(query.status) || comment.status === query.status)
    .filter((comment) => !query.reported || comment.reports > 0)
    .filter(
      (comment) =>
        !query.q || [comment.body, comment.author, comment.novelTitle].some((field) => includes(field, query.q as string))
    );
}

export function getCommentStatusCounts() {
  return adminComments.reduce<Record<string, number>>((counts, comment) => {
    counts[comment.status] = (counts[comment.status] ?? 0) + 1;
    return counts;
  }, {});
}

/* --------------------------------------------------------------- รายงาน */

export function getAdminReports(status?: string, q?: string): AdminReport[] {
  return adminReports
    .filter((report) => isAll(status) || report.status === status)
    .filter((report) => !q || [report.targetLabel, report.detail, report.reporter].some((field) => includes(field, q)));
}

export function getOpenReportCount() {
  return adminReports.filter((report) => report.status === "open" || report.status === "reviewing").length;
}

/* -------------------------------------------------------------- ธุรกรรม */

export type TransactionQuery = {
  q?: string;
  kind?: TransactionKind | "all";
  status?: TransactionStatus | "all";
  method?: string;
};

export function getAdminTransactions(query: TransactionQuery = {}): AdminTransaction[] {
  return adminTransactions
    .filter((tx) => isAll(query.kind) || tx.kind === query.kind)
    .filter((tx) => isAll(query.status) || tx.status === query.status)
    .filter((tx) => isAll(query.method) || tx.method === query.method)
    .filter((tx) => !query.q || [tx.reference, tx.memberName, tx.id].some((field) => includes(field, query.q as string)));
}

/** ยอดเงินเข้าที่สำเร็จแล้ว — ใช้ทั้งหน้าธุรกรรมและ dashboard */
export function getTransactionSummary() {
  const success = adminTransactions.filter((tx) => tx.status === "success" && tx.kind === "topup");
  const refunded = adminTransactions.filter((tx) => tx.status === "refunded");

  return {
    grossTHB: success.reduce((total, tx) => total + tx.amountTHB, 0),
    refundTHB: refunded.reduce((total, tx) => total + tx.amountTHB, 0),
    coinsSold: success.reduce((total, tx) => total + tx.coins, 0),
    pending: adminTransactions.filter((tx) => tx.status === "pending").length,
    failed: adminTransactions.filter((tx) => tx.status === "failed").length
  };
}

/** สัดส่วนยอดเติมแยกตามช่องทางชำระเงิน */
export function getRevenueByMethod(): SeriesPoint[] {
  const totals = new Map<string, number>();
  adminTransactions
    .filter((tx) => tx.kind === "topup" && tx.status === "success")
    .forEach((tx) => totals.set(tx.method, (totals.get(tx.method) ?? 0) + tx.amountTHB));

  const labels: Record<string, string> = {
    truemoney: "TrueMoney",
    promptpay: "PromptPay",
    card: "บัตรเครดิต",
    linepay: "LINE Pay"
  };

  return [...totals.entries()]
    .map(([method, value]) => ({ label: labels[method] ?? method, value }))
    .sort((a, b) => b.value - a.value);
}

/* ------------------------------------------------------ payout / ประกาศ */

export function getPayouts(status?: string) {
  return isAll(status) ? adminPayouts : adminPayouts.filter((payout) => payout.status === status);
}

export function getPendingPayoutTotal() {
  return adminPayouts.filter((payout) => payout.status === "pending").reduce((total, payout) => total + payout.amountTHB, 0);
}

export function getAnnouncements(status?: string) {
  return isAll(status) ? adminAnnouncements : adminAnnouncements.filter((item) => item.status === status);
}

export function getBanners() {
  return [...adminBanners].sort((a, b) => a.order - b.order);
}

export function getActivities(limit?: number) {
  return limit ? adminActivities.slice(0, limit) : adminActivities;
}

/* ------------------------------------------------------------ Dashboard */

/** KPI 4 ตัวบนสุดของหน้าแรกหลังบ้าน */
export function getDashboardStats(): KpiStat[] {
  const summary = getTransactionSummary();
  const readersToday = dailyReaders[dailyReaders.length - 1].value;
  const readersYesterday = dailyReaders[dailyReaders.length - 2].value;
  const revenueThisMonth = monthlyRevenue[monthlyRevenue.length - 1].value;
  const revenueLastMonth = monthlyRevenue[monthlyRevenue.length - 2].value;

  return [
    {
      id: "readers",
      label: "ผู้อ่านวันนี้",
      value: readersToday,
      delta: Number((((readersToday - readersYesterday) / readersYesterday) * 100).toFixed(1)),
      unit: "คน",
      hint: "เทียบกับเมื่อวาน"
    },
    {
      id: "revenue",
      label: "รายได้เดือนนี้",
      value: revenueThisMonth,
      delta: Number((((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1)),
      unit: "บาท",
      hint: "เทียบกับเดือนก่อน"
    },
    {
      id: "members",
      label: "สมาชิกทั้งหมด",
      value: 184203 + members.length,
      delta: 4.2,
      unit: "คน",
      hint: "สมาชิกใหม่ 1,284 คนใน 7 วัน"
    },
    {
      id: "coins",
      label: "เหรียญที่ขายได้",
      value: summary.coinsSold,
      delta: -1.8,
      unit: "เหรียญ",
      hint: "จากธุรกรรมที่สำเร็จใน 24 ชม."
    }
  ];
}

/** งานที่ค้างอยู่ ใช้ทำการ์ด "รอคุณดำเนินการ" บน dashboard */
export function getPendingWork() {
  return {
    submissions: getPendingSubmissionCount(),
    reports: getOpenReportCount(),
    comments: adminComments.filter((comment) => comment.status === "pending").length,
    payouts: adminPayouts.filter((payout) => payout.status === "pending").length,
    drafts: adminChapters.filter((chapter) => chapter.publishStatus === "draft").length
  };
}

/** เรื่องที่ทำรายได้สูงสุด — ตารางย่อบน dashboard และหน้า analytics */
export function getTopNovels(limit = 5) {
  return [...adminNovels].sort((a, b) => b.revenueTHB - a.revenueTHB).slice(0, limit);
}
