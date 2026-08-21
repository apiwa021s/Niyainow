import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CreateStoryWizard } from "@/components/studio/create-story/create-story-wizard";

export const metadata: Metadata = { title: "สร้างเรื่องใหม่" };

export default function NewWorkPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <Link
        href="/studio/works"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        กลับไปผลงานของฉัน
      </Link>

      <h1 className="mb-5 text-h1 font-semibold">สร้างเรื่องใหม่</h1>

      <CreateStoryWizard />
    </div>
  );
}
