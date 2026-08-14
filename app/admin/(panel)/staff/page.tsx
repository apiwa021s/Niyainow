import type { Metadata } from "next";
import { UnsupportedAdminPage } from "@/components/admin/feature-unavailable";
export const metadata: Metadata = { title: "ทีมงานและสิทธิ์" };
export default function Page() { return <UnsupportedAdminPage title="ทีมงานและสิทธิ์" />; }
