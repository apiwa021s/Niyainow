import type { Metadata } from "next";
import { UnsupportedAdminPage } from "@/components/admin/feature-unavailable";
export const metadata: Metadata = { title: "การจ่ายรายได้" };
export default function Page() { return <UnsupportedAdminPage title="การจ่ายรายได้" />; }
