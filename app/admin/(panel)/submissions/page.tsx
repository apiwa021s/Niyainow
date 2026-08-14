import type { Metadata } from "next";
import { UnsupportedAdminPage } from "@/components/admin/feature-unavailable";
export const metadata: Metadata = { title: "เรื่องรออนุมัติ" };
export default function Page() { return <UnsupportedAdminPage title="เรื่องรออนุมัติ" />; }
