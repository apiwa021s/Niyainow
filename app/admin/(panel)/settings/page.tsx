import type { Metadata } from "next";
import { UnsupportedAdminPage } from "@/components/admin/feature-unavailable";
export const metadata: Metadata = { title: "ตั้งค่าระบบ" };
export default function Page() { return <UnsupportedAdminPage title="ตั้งค่าระบบ" />; }
