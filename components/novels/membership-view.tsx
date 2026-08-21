"use client";

import { Check, ChevronLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button";
import { useLocalMockStore } from "@/hooks/use-local-mock-store";
import { readMemberships, writeMemberships, type MembershipRecord } from "@/lib/domain/reader-membership";
import type { WriterMembership } from "@/lib/domain/reader-taste";

const dateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" });
const DAY_MS = 24 * 60 * 60 * 1_000;

/**
 * Reader-side membership join/manage UI (brief §69–72). No billing backend
 * exists, so joining/cancelling is a local-only mock — the UI states are what
 * matter for this pass, not real subscription lifecycle.
 */
export function MembershipView({
  novelSlug,
  novelHref,
  novelTitle,
  novelCover,
  author,
  membership,
}: {
  novelSlug: string;
  novelHref: string;
  novelTitle: string;
  novelCover: string;
  author: string;
  membership: WriterMembership;
}) {
  const record = useLocalMockStore<MembershipRecord | null>(
    () => readMemberships()[novelSlug] ?? null,
    () => null,
  );

  function join() {
    const all = readMemberships();
    all[novelSlug] = {
      novelSlug,
      novelTitle,
      novelCover,
      author,
      membershipName: membership.name,
      priceLabel: membership.priceLabel,
      joinedAt: Date.now(),
    };
    writeMemberships(all);
  }

  function requestCancel() {
    if (!record) return;
    const all = readMemberships();
    all[novelSlug] = { ...record, cancelPending: true };
    writeMemberships(all);
  }

  function reactivate() {
    if (!record) return;
    const all = readMemberships();
    all[novelSlug] = { ...record, cancelPending: false };
    writeMemberships(all);
  }

  const renewsAt = record ? new Date(record.joinedAt + 30 * DAY_MS) : null;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-2 sm:py-3">
      <Link href={novelHref} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        กลับไปหน้านิยาย
      </Link>

      {!record ? (
        <section className="rounded-(--r-lg) border border-[var(--brand-emphasis)]/25 bg-surface p-6">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)]">
            <Sparkles className="h-4 w-4" aria-hidden />
            {membership.name}
          </p>
          <p className="mt-2 text-3xl font-semibold">{membership.priceLabel}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            สนับสนุนนักเขียนและรับสิทธิพิเศษ
          </p>
          <ul className="mt-5 grid gap-2 text-sm">
            {membership.perks.map((perk) => (
              <li key={perk} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-[var(--brand-emphasis)]" aria-hidden />
                {perk}
              </li>
            ))}
          </ul>
          <Button type="button" onClick={join} className="mt-6 w-full">
            สมัคร Membership
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            เดโมนี้ยังไม่เชื่อมระบบชำระเงินจริง
          </p>
        </section>
      ) : (
        <section className="rounded-(--r-lg) border border-[var(--brand-emphasis)]/25 bg-surface p-6">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)]">
            <Check className="h-4 w-4" aria-hidden />
            สมาชิกแล้ว
          </p>
          <p className="mt-1 text-lg font-semibold">{membership.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{membership.priceLabel}</p>

          <dl className="mt-5 grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">สถานะ</dt>
              <dd className="font-medium">{record.cancelPending ? "จะสิ้นสุดเมื่อครบรอบ" : "ใช้งานอยู่"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">รอบปัจจุบัน</dt>
              <dd className="font-medium">ถึง {renewsAt ? dateFormatter.format(renewsAt) : "—"}</dd>
            </div>
          </dl>

          {record.cancelPending ? (
            <p className="mt-4 rounded-(--r-md) bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
              คุณยังใช้สิทธิ์สมาชิกได้จนถึง {renewsAt ? dateFormatter.format(renewsAt) : "—"}
            </p>
          ) : null}

          <ul className="mt-5 grid gap-2 text-sm text-muted-foreground">
            {membership.perks.map((perk) => (
              <li key={perk} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-[var(--brand-emphasis)]" aria-hidden />
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-2">
            <ButtonLink href={novelHref} className="w-full">กลับไปอ่านต่อ</ButtonLink>
            {record.cancelPending ? (
              <Button type="button" variant="outline" onClick={reactivate} className="w-full">
                เปิดใช้งานต่อ
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={requestCancel} className="w-full">
                ยกเลิก Membership
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
