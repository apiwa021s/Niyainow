"use client";

import { BookOpen, ListOrdered } from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  BookmarkButton,
  FollowButton,
  LibraryButton,
  type NovelLibraryStatus,
} from "@/components/interactive/novel-actions";
import { useNovelChapterDialog } from "@/components/novels/novel-chapter-dialog-context";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  selectNovelResumeProgress,
  useReaderStore,
  type NovelResumeSelection,
  type ReadingPositionCandidate,
} from "@/stores/use-reader-store";
import type { NovelResumeServerProgress } from "@/types/novel";

const subscribeToClient = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function serverCandidate(progress?: NovelResumeServerProgress | null): ReadingPositionCandidate | null {
  if (!progress) return null;
  return {
    chapterNumber: progress.chapterNumber,
    chapterTitle: progress.chapterTitle,
    progressPercent: progress.progressPercent,
    position: progress.position,
    updatedAt: Date.parse(progress.lastReadAt) || 0,
  };
}

/**
 * During SSR and the hydration pass this deliberately returns only the server
 * fallback. Persisted browser state is considered after React owns the tree,
 * so a fresher guest/local destination never creates a hydration mismatch.
 */
export function useNovelResumeProgress(
  slug: string,
  serverProgress?: NovelResumeServerProgress | null,
): NovelResumeSelection | null {
  const clientReady = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);
  const storeHydrated = useReaderStore((state) => state.hasHydrated);
  const local = useReaderStore((state) => state.localProgress[slug]);
  const server = useMemo(() => serverCandidate(serverProgress), [serverProgress]);

  if (!clientReady || !storeHydrated) {
    return server ? { source: "server", progress: server } : null;
  }
  return selectNovelResumeProgress({ local, server });
}

function progressHref(slug: string, selection: NovelResumeSelection) {
  return `/novel/${slug}/chapter/${selection.progress.chapterNumber}`;
}

function chapterLabel(chapterNumber: number) {
  return chapterNumber.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

type ResumeActionProps = {
  slug: string;
  startHref: string;
  startLabel: string;
  serverProgress?: NovelResumeServerProgress | null;
  libraryStatus?: NovelLibraryStatus | null;
  followed?: boolean;
  bookmarkCount?: number;
  onOpenChapters?: () => void;
};

export function NovelResumeActions({
  slug,
  startHref,
  startLabel,
  serverProgress,
  libraryStatus,
  followed,
  bookmarkCount,
}: ResumeActionProps) {
  const { openDialog } = useNovelChapterDialog();
  const selection = useNovelResumeProgress(slug, serverProgress);
  const href = selection ? progressHref(slug, selection) : startHref;
  const label = selection
    ? `อ่านต่อ ตอนที่ ${chapterLabel(selection.progress.chapterNumber)}`
    : startLabel;
  const percent = selection ? Math.max(0, Math.min(100, Math.round(selection.progress.progressPercent))) : 0;

  return (
    <div className="mt-6">
      <div className="hidden flex-wrap items-center gap-2.5 lg:flex">
        <ButtonLink href={href} size="lg">
          <BookOpen className="h-4 w-4" />
          {label}
        </ButtonLink>
        <Button type="button" variant="outline" size="lg" onClick={openDialog}>
          <ListOrdered className="h-4 w-4" />
          สารบัญ
        </Button>
        <LibraryButton slug={slug} initialStatus={libraryStatus} count={bookmarkCount} />
        <FollowButton slug={slug} initialActive={followed} />
      </div>

      {selection ? (
        <div className="mt-4 hidden max-w-lg lg:block" data-resume-source={selection.source}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>ตำแหน่งล่าสุด · ตอนที่ {chapterLabel(selection.progress.chapterNumber)}</span>
            <span className="tabular">{percent}%</span>
          </div>
          <div className="h-1 overflow-hidden bg-muted">
            <div className="h-full bg-[var(--brand-primary)]" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function NovelResumeMobileBar({
  slug,
  startHref,
  startLabel,
  serverProgress,
  libraryStatus,
  followed,
  onOpenChapters,
}: ResumeActionProps) {
  const selection = useNovelResumeProgress(slug, serverProgress);
  const href = selection ? progressHref(slug, selection) : startHref;
  const label = selection
    ? `อ่านต่อ ตอนที่ ${chapterLabel(selection.progress.chapterNumber)}`
    : startLabel;

  return (
    <div className="novel-resume-mobile-bar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <button
          type="button"
          onClick={onOpenChapters}
          aria-label="เปิดสารบัญ"
          title="สารบัญ"
          aria-haspopup="dialog"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[6px] border border-border bg-card hover:bg-muted"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <BookmarkButton slug={slug} initialStatus={libraryStatus} />
        <FollowButton slug={slug} initialActive={followed} iconOnly />
        <Link
          href={href}
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[8px] bg-[var(--brand-primary)] px-3 text-base font-semibold text-white shadow-[var(--sh-brand)] active:translate-y-px"
        >
          <BookOpen className="h-5 w-5 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
      </div>
    </div>
  );
}

export function NovelCatalogResume({
  slug,
  serverProgress,
}: {
  slug: string;
  serverProgress?: NovelResumeServerProgress | null;
}) {
  const selection = useNovelResumeProgress(slug, serverProgress);
  if (!selection) return null;

  const percent = Math.max(0, Math.min(100, Math.round(selection.progress.progressPercent)));
  return (
    <div
      className="rounded-(--r-lg) bg-[color-mix(in_srgb,var(--brand-primary)_7%,transparent)] px-4 py-3 text-sm"
      data-resume-source={selection.source}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">อ่านค้างไว้ที่ตอน {chapterLabel(selection.progress.chapterNumber)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">ความคืบหน้า {percent}%</p>
        </div>
        <Link
          href={progressHref(slug, selection)}
          className="inline-flex min-h-11 items-center rounded-[8px] bg-[var(--brand-primary)] px-4 font-semibold text-white shadow-[var(--sh-brand)]"
        >
          อ่านต่อ
        </Link>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/70">
        <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
