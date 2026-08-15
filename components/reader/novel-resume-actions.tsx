"use client";

import { BookOpen, ListOrdered, Play } from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  BookmarkButton,
  FollowButton,
  LibraryButton,
  ShareButton,
  type NovelLibraryStatus,
} from "@/components/interactive/novel-actions";
import { ButtonLink } from "@/components/ui/button";
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
  title: string;
  startHref: string;
  startLabel: string;
  serverProgress?: NovelResumeServerProgress | null;
  followed?: boolean;
  libraryStatus?: NovelLibraryStatus | null;
  bookmarkCount?: number;
};

export function NovelResumeActions({
  slug,
  title,
  startHref,
  startLabel,
  serverProgress,
  followed,
  libraryStatus,
  bookmarkCount,
}: ResumeActionProps) {
  const selection = useNovelResumeProgress(slug, serverProgress);
  const progressed = selection !== null;
  const href = selection ? progressHref(slug, selection) : startHref;
  const label = selection
    ? `อ่านต่อ ตอนที่ ${chapterLabel(selection.progress.chapterNumber)}`
    : startLabel;
  const percent = selection ? Math.max(0, Math.min(100, Math.round(selection.progress.progressPercent))) : 0;

  return (
    <div className="mt-6">
      <div className="hidden flex-wrap gap-2.5 lg:flex">
        <ButtonLink href={href} size="lg">
          <Play className="h-4 w-4 fill-current" />
          {label}
        </ButtonLink>
        {progressed ? (
          <ButtonLink href={`/novel/${slug}/chapters`} variant="outline">
            <ListOrdered className="h-4 w-4" />
            สารบัญ
          </ButtonLink>
        ) : (
          <LibraryButton slug={slug} initialStatus={libraryStatus} count={bookmarkCount} />
        )}
        <ShareButton title={title} />
      </div>

      <div className="mt-2 flex justify-center md:justify-start">
        <FollowButton slug={slug} initialActive={followed} quiet />
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
  title,
  startHref,
  startLabel,
  serverProgress,
  libraryStatus,
}: ResumeActionProps) {
  const selection = useNovelResumeProgress(slug, serverProgress);
  const href = selection ? progressHref(slug, selection) : startHref;
  const label = selection
    ? `อ่านต่อ ตอนที่ ${chapterLabel(selection.progress.chapterNumber)}`
    : startLabel;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background px-4 py-2.5 lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <Link
          href={href}
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[8px] bg-[var(--brand-primary)] px-3 text-base font-semibold text-white shadow-[var(--sh-brand)] active:translate-y-px"
        >
          <BookOpen className="h-5 w-5 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>

        {selection ? (
          <Link
            href={`/novel/${slug}/chapters`}
            aria-label="เปิดสารบัญ"
            title="สารบัญ"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[6px] border border-border bg-card hover:bg-muted"
          >
            <ListOrdered className="h-4 w-4" />
          </Link>
        ) : (
          <BookmarkButton slug={slug} initialStatus={libraryStatus} />
        )}
        <ShareButton title={title} compact />
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
      className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[color-mix(in_srgb,var(--brand-primary)_5%,transparent)] px-4 py-3 text-sm"
      data-resume-source={selection.source}
    >
      <div>
        <p className="font-semibold">อ่านค้างไว้ที่ตอน {chapterLabel(selection.progress.chapterNumber)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">ความคืบหน้า {percent}%</p>
      </div>
      <Link
        href={progressHref(slug, selection)}
        className="inline-flex min-h-11 items-center px-2 font-semibold text-[var(--brand-emphasis)]"
      >
        อ่านต่อ
      </Link>
    </div>
  );
}
