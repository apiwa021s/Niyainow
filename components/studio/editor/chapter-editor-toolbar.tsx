"use client";

import { Bold, Italic, Heading2, MoreHorizontal, Quote } from "lucide-react";
import type { RefObject } from "react";

type Mark = {
  label: string;
  icon: typeof Bold;
  before: string;
  after: string;
  shortcut?: string;
  blockPrefix?: boolean;
};

const MARKS: readonly Mark[] = [
  { label: "ตัวหนา", icon: Bold, before: "**", after: "**", shortcut: "Ctrl+B" },
  { label: "ตัวเอียง", icon: Italic, before: "*", after: "*", shortcut: "Ctrl+I" },
  { label: "หัวข้อย่อย", icon: Heading2, before: "## ", after: "", blockPrefix: true },
  { label: "ข้อความอ้างอิง", icon: Quote, before: "> ", after: "", blockPrefix: true },
];

const SCENE_BREAK = "\n\n• • •\n\n";

function applyMark(
  textarea: HTMLTextAreaElement,
  mark: Mark,
  onChange: (next: string) => void,
) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);

  if (mark.blockPrefix) {
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const next = value.slice(0, lineStart) + mark.before + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => textarea.setSelectionRange(selectionStart + mark.before.length, selectionEnd + mark.before.length));
    return;
  }

  const next = value.slice(0, selectionStart) + mark.before + selected + mark.after + value.slice(selectionEnd);
  onChange(next);
  requestAnimationFrame(() =>
    textarea.setSelectionRange(selectionStart + mark.before.length, selectionEnd + mark.before.length),
  );
}

function insertSceneBreak(textarea: HTMLTextAreaElement, onChange: (next: string) => void) {
  const { selectionEnd, value } = textarea;
  const next = value.slice(0, selectionEnd) + SCENE_BREAK + value.slice(selectionEnd);
  onChange(next);
  const cursor = selectionEnd + SCENE_BREAK.length;
  requestAnimationFrame(() => textarea.setSelectionRange(cursor, cursor));
}

/**
 * Five marks, nothing else — no font/size/color/table controls (spec §11):
 * the reader's typography is NovelNow's to control, not a per-chapter choice.
 */
export function ChapterEditorToolbar({
  textareaRef,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (next: string) => void;
}) {
  function run(mark: Mark) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    applyMark(textarea, mark, onChange);
  }

  function runSceneBreak() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    insertSceneBreak(textarea, onChange);
  }

  return (
    <div role="toolbar" aria-label="เครื่องมือจัดรูปแบบ" className="flex items-center gap-0.5 rounded-(--r-md) border border-border bg-card p-1">
      {MARKS.map((mark) => {
        const Icon = mark.icon;
        return (
          <button
            key={mark.label}
            type="button"
            title={mark.shortcut ? `${mark.label} (${mark.shortcut})` : mark.label}
            aria-label={mark.label}
            onClick={() => run(mark)}
            className="grid h-9 w-9 place-items-center rounded-(--r-sm) text-(--text-secondary) hover:bg-muted hover:text-(--text-primary)"
          >
            <Icon aria-hidden className="h-4 w-4" />
          </button>
        );
      })}
      <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
      <button
        type="button"
        title="แบ่งฉาก"
        aria-label="แบ่งฉาก"
        onClick={runSceneBreak}
        className="grid h-9 w-9 place-items-center rounded-(--r-sm) text-(--text-secondary) hover:bg-muted hover:text-(--text-primary)"
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Ctrl/Cmd+B and Ctrl/Cmd+I, wired from the editor's onKeyDown. */
export function handleToolbarShortcut(
  event: React.KeyboardEvent<HTMLTextAreaElement>,
  onChange: (next: string) => void,
) {
  const isMod = event.metaKey || event.ctrlKey;
  if (!isMod) return false;
  const mark = event.key.toLowerCase() === "b" ? MARKS[0] : event.key.toLowerCase() === "i" ? MARKS[1] : null;
  if (!mark) return false;
  event.preventDefault();
  applyMark(event.currentTarget, mark, onChange);
  return true;
}
