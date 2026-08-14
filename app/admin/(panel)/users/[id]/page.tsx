import type { Metadata } from "next";
import { UnsupportedAdminPage } from "@/components/admin/feature-unavailable";
export const metadata: Metadata = { title: "ข้อมูลสมาชิก" };
export default function Page() { return <UnsupportedAdminPage title="ข้อมูลสมาชิก" />; }
