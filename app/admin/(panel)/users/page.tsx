import type { Metadata } from "next";
import { UnsupportedAdminPage } from "@/components/admin/feature-unavailable";
export const metadata: Metadata = { title: "สมาชิก" };
export default function Page() { return <UnsupportedAdminPage title="สมาชิก" />; }
