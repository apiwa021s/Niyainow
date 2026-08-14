import { BookOpen, FileStack, LayoutDashboard, MessageSquare, ScrollText, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "submissions" | "reports" | "comments" | "payouts";
  exact?: boolean;
};

export type AdminNavGroup = { title: string; items: AdminNavItem[] };

/** Only production-backed modules are shown. Disabled routes remain addressable
 * with an honest explanation, but are intentionally absent from navigation. */
export const adminNavGroups: AdminNavGroup[] = [
  {
    title: "ภาพรวม",
    items: [{ href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "เนื้อหา",
    items: [
      { href: "/admin/novels", label: "นิยาย", icon: BookOpen },
      { href: "/admin/chapters", label: "ตอนทั้งหมด", icon: FileStack },
      { href: "/admin/genres", label: "แนวนิยาย", icon: Tags },
      { href: "/admin/tags", label: "แท็ก", icon: Tags },
    ],
  },
  {
    title: "ตรวจสอบ",
    items: [
      { href: "/admin/comments", label: "ตรวจรีวิว", icon: MessageSquare, badge: "comments" },
      { href: "/admin/activity", label: "บันทึกกิจกรรม", icon: ScrollText },
    ],
  },
];

export function isNavItemActive(item: AdminNavItem, pathname: string | null) {
  if (!pathname) return false;
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
