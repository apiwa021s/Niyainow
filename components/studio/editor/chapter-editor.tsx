"use client";

import { ArrowLeft, Eye, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { AutosaveIndicator } from "@/components/studio/editor/autosave-indicator";
import { ChapterEditorToolbar, handleToolbarShortcut } from "@/components/studio/editor/chapter-editor-toolbar";
import { DraftRecoveryDialog } from "@/components/studio/editor/draft-recovery-dialog";
import { useChapterDraft } from "@/components/studio/editor/use-chapter-draft";
import { PublishDrawer } from "@/components/studio/publish/publish-drawer";
import type { StudioWork } from "@/components/studio/mock-data";
import { whole } from "@/components/studio/mock-data";
import { Button } from "@/components/ui/button";

const READING_SPEED_CPM = 770; // Thai has no word spaces — characters/minute reads more honestly than a word count.

export function ChapterEditor({
  work,
  chapterNumber,
  initialTitle,
  initialContent,
  serverSavedAt,
}: {
  work: StudioWork;
  chapterNumber: number;
  initialTitle: string;
  initialContent: string;
  serverSavedAt: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const draft = useChapterDraft({
    storySlug: work.slug,
    chapterKey: String(chapterNumber),
    serverValue: { title: initialTitle, content: initialContent },
    serverSavedAt,
  });

  const label = `EP.${String(chapterNumber).padStart(2, "0")}`;
  const characters = draft.value.content.length;
  const words = Math.round(characters / 3.5);
  const minutes = Math.max(1, Math.round(characters / READING_SPEED_CPM));

  return (
    <div className="flex min-h-dvh flex-col">
      {!focusMode ? (
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-(--bg-base)/95 px-3 backdrop-blur-md sm:px-5">
          <Link
            href={`/studio/works/${work.slug}`}
            className="inline-flex min-h-11 min-w-0 items-center gap-1.5 truncate text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
          >
            <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
            <span className="truncate">{work.title}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <AutosaveIndicator state={draft.saveState} />
            <button
              type="button"
              onClick={() => setFocusMode(true)}
              className="grid h-9 w-9 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-muted"
              aria-label="เปิดโหมดเขียน"
              title="โหมดเขียน"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </header>
      ) : (
        <div className="fixed right-3 top-3 z-20 flex items-center gap-3 sm:right-5 sm:top-5">
          <AutosaveIndicator state={draft.saveState} />
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-(--bg-base) text-(--text-secondary) hover:bg-muted"
            aria-label="ออกจากโหมดเขียน"
            title="ออกจากโหมดเขียน"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[800px] flex-1 flex-col gap-4 px-4 py-6 sm:px-0 sm:py-10">
        <p className="tabular-nums text-sm font-semibold text-brand-primary">{label}</p>

        <div>
          <label htmlFor="chapter-title" className="text-xs font-medium text-(--text-secondary)">
            ชื่อตอน
          </label>
          <input
            id="chapter-title"
            value={draft.value.title}
            onChange={(event) => draft.update({ title: event.target.value })}
            placeholder="เช่น คืนที่ไม่มีใครหลับ"
            maxLength={150}
            className="mt-1 w-full border-0 bg-transparent text-2xl font-semibold outline-none placeholder:text-(--text-tertiary) sm:text-3xl"
          />
        </div>

        {!focusMode ? <ChapterEditorToolbar textareaRef={textareaRef} onChange={(content) => draft.update({ content })} /> : null}

        <hr className="border-border" />

        <textarea
          ref={textareaRef}
          value={draft.value.content}
          onChange={(event) => draft.update({ content: event.target.value })}
          onKeyDown={(event) => {
            handleToolbarShortcut(event, (content) => draft.update({ content }));
          }}
          placeholder="เริ่มพิมพ์ตอนของคุณที่นี่…"
          className="min-h-140 w-full flex-1 resize-none border-0 bg-transparent text-base leading-9 outline-none placeholder:text-(--text-tertiary)"
        />

        <hr className="border-border" />

        <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
          <p className="tabular-nums text-sm text-(--text-secondary)">
            {whole.format(words)} คำ · อ่านประมาณ {minutes} นาที
          </p>
          {!focusMode ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.open(`/studio/works/${work.slug}/chapters/${chapterNumber}/preview`, "_blank")}>
                <Eye aria-hidden className="h-4 w-4" />
                Preview
              </Button>
              <Button variant="primary" onClick={() => setPublishOpen(true)}>
                เผยแพร่ตอน
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <DraftRecoveryDialog
        open={draft.recoverable !== null}
        localSavedAt={draft.recoverable?.savedAt ?? 0}
        serverSavedAt={serverSavedAt}
        onUseLocal={draft.acceptLocalRecovery}
        onUseServer={draft.discardLocalRecovery}
      />

      <PublishDrawer
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        work={work}
        chapterNumber={chapterNumber}
        chapterTitle={draft.value.title || `EP.${chapterNumber}`}
        words={words}
        onPublished={() => draft.markPublished()}
      />
    </div>
  );
}
