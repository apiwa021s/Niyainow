"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/section";
import { useLocalMockStore } from "@/hooks/use-local-mock-store";
import { readMemberships, type MembershipRecord } from "@/lib/domain/reader-membership";

/**
 * Library "Membership" tab (brief §78). Memberships are a local-only mock
 * (see lib/domain/reader-membership.ts), so this reads localStorage on the
 * client instead of a server query — same list a reader built up across
 * novel detail pages.
 */
export function LibraryMembershipList() {
  const records = useLocalMockStore<MembershipRecord[]>(
    () => Object.values(readMemberships()).sort((a, b) => b.joinedAt - a.joinedAt),
    () => [],
  );

  if (!records.length) {
    return (
      <EmptyState
        title="ยังไม่ได้เป็นสมาชิกนักเขียนคนไหน"
        description="เปิดหน้านิยายที่มี Membership แล้วสมัครเพื่อรับสิทธิ์อ่านก่อนใครและตอนพิเศษ"
        icon={<Sparkles className="h-6 w-6" />}
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {records.map((record) => (
        <div key={record.novelSlug} className="grid min-h-24 grid-cols-[56px_minmax(0,1fr)] items-center gap-4 py-4 sm:grid-cols-[56px_minmax(0,1fr)_auto]">
          <Link href={`/novel/${record.novelSlug}`} className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-full bg-muted">
            <Image src={record.novelCover} alt="" fill sizes="56px" className="object-cover" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{record.author}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{record.membershipName}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {record.cancelPending ? "จะสิ้นสุดเมื่อครบรอบ" : "สมาชิกอยู่"}
            </p>
          </div>
          <ButtonLink href={`/novel/${record.novelSlug}/membership`} variant="outline" size="sm" className="col-start-2 justify-self-start sm:col-start-auto">
            ดูสิทธิ์
          </ButtonLink>
        </div>
      ))}
    </div>
  );
}
