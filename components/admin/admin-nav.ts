import {
  BarChart3,
  BellRing,
  BookOpen,
  ClipboardCheck,
  Coins,
  FileStack,
  Flag,
  Image,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  Tags,
  Users,
  Wallet
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * โครงเมนูหลังบ้าน — แบ่งเป็นกลุ่มตามงาน ไม่ใช่ตามตารางข้อมูล
 * badge: คีย์ของตัวเลขงานค้าง (ดู getPendingWork ใน admin-service)
 */
export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "submissions" | "reports" | "comments" | "payouts";
  /** ให้ active เฉพาะตอน path ตรงเป๊ะ — ใช้กับหน้าแรกที่เป็น prefix ของทุกหน้า */
  exact?: boolean;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    title: "ภาพรวม",
    items: [
      { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard, exact: true },
      { href: "/admin/analytics", label: "สถิติเชิงลึก", icon: BarChart3 }
    ]
  },
  {
    title: "เนื้อหา",
    items: [
      { href: "/admin/novels", label: "นิยาย", icon: BookOpen },
      { href: "/admin/chapters", label: "ตอนทั้งหมด", icon: FileStack },
      { href: "/admin/submissions", label: "เรื่องรออนุมัติ", icon: ClipboardCheck, badge: "submissions" },
      { href: "/admin/genres", label: "แนวนิยาย", icon: Tags },
      { href: "/admin/tags", label: "แท็ก", icon: Tags }
    ]
  },
  {
    title: "ชุมชน",
    items: [
      { href: "/admin/users", label: "สมาชิก", icon: Users },
      { href: "/admin/comments", label: "คอมเมนต์", icon: MessageSquare, badge: "comments" },
      { href: "/admin/reports", label: "รายงานปัญหา", icon: Flag, badge: "reports" },
      { href: "/admin/staff", label: "ทีมงานและสิทธิ์", icon: Shield }
    ]
  },
  {
    title: "การเงิน",
    items: [
      { href: "/admin/coins", label: "แพ็กเกจเหรียญ", icon: Coins },
      { href: "/admin/transactions", label: "ธุรกรรม", icon: Receipt },
      { href: "/admin/payouts", label: "จ่ายรายได้ทีมแปล", icon: Wallet, badge: "payouts" }
    ]
  },
  {
    title: "ระบบ",
    items: [
      { href: "/admin/announcements", label: "ประกาศและแจ้งเตือน", icon: BellRing },
      { href: "/admin/banners", label: "แบนเนอร์หน้าแรก", icon: Image },
      { href: "/admin/activity", label: "บันทึกกิจกรรม", icon: ScrollText },
      { href: "/admin/settings", label: "ตั้งค่าเว็บไซต์", icon: Settings }
    ]
  }
];

/** ใช้ทั้งไฮไลต์เมนูและสร้าง breadcrumb */
export function isNavItemActive(item: AdminNavItem, pathname: string | null) {
  if (!pathname) return false;
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
