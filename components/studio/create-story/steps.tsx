"use client";

import { Bold, ExternalLink, Flame, Italic, Pilcrow, Quote } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { CoverUploader } from "@/components/studio/create-story/cover-uploader";
import {
  SearchableChipSelector,
  SelectableCard,
  SelectableChip,
  SelectionCounter,
} from "@/components/studio/create-story/selectable";
import { HeatBadge, StoryPreview } from "@/components/studio/create-story/story-preview";
import type { StepErrors, StoryDraft } from "@/components/studio/create-story/use-story-draft";
import { QuestionBlock } from "@/components/studio/create-story/wizard-chrome";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import {
  CONTENT_ORIGINS,
  CONTENT_WARNINGS,
  HEAT_LEVELS,
  PRIMARY_GENRES,
  RELATIONSHIP_TYPES,
  STORY_LIMITS,
  STORY_SETTINGS,
  STORY_STATUSES,
  STORY_TYPES,
  TROPES,

} from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

type StepProps = {
  draft: StoryDraft;
  errors: StepErrors;
  update: <K extends keyof StoryDraft>(key: K, value: StoryDraft[K]) => void;
};

/** Four marks only. A full toolbar invites layout fiddling the reader view ignores. */
const SYNOPSIS_TOOLS = [
  { label: "ตัวหนา", icon: Bold, prefix: "**", suffix: "**" },
  { label: "ตัวเอียง", icon: Italic, prefix: "*", suffix: "*" },
  { label: "ย่อหน้าใหม่", icon: Pilcrow, prefix: "\n\n", suffix: "" },
  { label: "ข้อความอ้างอิง", icon: Quote, prefix: "\n> ", suffix: "" },
] as const;

function Counter({ value, max }: { value: number; max: number }) {
  const near = value > max - max * 0.1;
  return (
    <span className={cn("text-xs tabular-nums", near ? "text-[var(--brand-emphasis)]" : "text-(--text-tertiary)")}>
      {value} / {max}
    </span>
  );
}

/* ── Step 1 ─────────────────────────────────────────────────────────── */

export function StoryBasicInfoForm({ draft, errors, update }: StepProps) {
  const synopsisRef = useRef<HTMLTextAreaElement>(null);


  function wrap(prefix: string, suffix = prefix) {
    const field = synopsisRef.current;
    if (!field) return;
    const { selectionStart: start, selectionEnd: end, value } = field;
    const selected = value.slice(start, end) || "ข้อความ";
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    update("synopsis", next.slice(0, STORY_LIMITS.synopsisMax));
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  return (
    <div className="grid gap-7">
      <header>
        <h2 className="text-xl font-semibold sm:text-2xl">มาเริ่มสร้างเรื่องของคุณกัน</h2>
        <p className="mt-1.5 text-sm leading-7 text-(--text-secondary)">
          ใส่ข้อมูลพื้นฐานก่อน คุณสามารถกลับมาแก้ไขภายหลังได้เสมอ
        </p>
      </header>

      <QuestionBlock question="ปกนิยาย" description="ปกคือสิ่งแรกที่คนเห็นในหน้าแรกและผลค้นหา">
        <CoverUploader
          previewUrl={draft.coverUrl}
          onChange={(url, name) => {
            update("coverUrl", url);
            update("coverName", name);
          }}
          onUsePlaceholder={() => {
            update("coverUrl", null);
            update("coverName", "ปกชั่วคราว");
          }}
        />
      </QuestionBlock>

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="story-title" className="text-sm font-medium">
            ชื่อเรื่อง
          </label>
          <Counter value={draft.title.length} max={STORY_LIMITS.titleMax} />
        </div>
        <Input
          id="story-title"
          value={draft.title}
          invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "story-title-error" : undefined}
          onChange={(event) => update("title", event.target.value.slice(0, STORY_LIMITS.titleMax))}
          placeholder="เช่น รักที่ไม่ควรถูกเปิดเผย"
        />
        {errors.title ? (
          <p id="story-title-error" role="alert" className="text-sm font-medium text-destructive">
            ⚠ {errors.title}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="story-tagline" className="text-sm font-medium">
            คำโปรย
          </label>
          <Counter value={draft.tagline.length} max={STORY_LIMITS.taglineMax} />
        </div>
        <Textarea
          id="story-tagline"
          value={draft.tagline}
          onChange={(event) => update("tagline", event.target.value.slice(0, STORY_LIMITS.taglineMax))}
          placeholder="เขียนประโยคสั้น ๆ ที่ทำให้คนอยากกดเข้ามาอ่าน"
          className="min-h-20"
        />
        <p className="text-xs text-muted-foreground">บรรทัดนี้จะขึ้นใต้ชื่อเรื่องในการ์ดหน้าแรกและผลค้นหา</p>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="story-synopsis" className="text-sm font-medium">
            เรื่องย่อ
          </label>
          <Counter value={draft.synopsis.length} max={STORY_LIMITS.synopsisMax} />
        </div>

        <div className="flex flex-wrap gap-1">
          {SYNOPSIS_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                type="button"
                onClick={() => wrap(tool.prefix, tool.suffix)}
                aria-label={tool.label}
                title={tool.label}
                className="grid h-11 w-11 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-muted hover:text-(--text-primary)"
              >
                <Icon aria-hidden className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        <Textarea
          id="story-synopsis"
          ref={synopsisRef}
          value={draft.synopsis}
          onChange={(event) => update("synopsis", event.target.value.slice(0, STORY_LIMITS.synopsisMax))}
          placeholder="เล่าให้ผู้อ่านรู้จักโลก ตัวละคร หรือความสัมพันธ์หลักของเรื่อง…"
          className="min-h-56"
        />
      </div>
    </div>
  );
}

/* ── Step 2 ─────────────────────────────────────────────────────────── */

export function GenreAndStyleForm({ draft, errors, update }: StepProps) {
  const secondaryLeft = STORY_LIMITS.secondaryGenresMax - draft.secondaryGenreIds.length;

  return (
    <div className="grid gap-8">
      <header>
        <h2 className="text-xl font-semibold sm:text-2xl">ช่วยให้ NovelNow พาเรื่องของคุณไปหาคนอ่านที่ใช่</h2>
        <p className="mt-1.5 text-sm leading-7 text-(--text-secondary)">
          เลือกข้อมูลที่ตรงกับเรื่องมากที่สุด ไม่จำเป็นต้องเลือกทุกอย่าง
        </p>
      </header>

      <QuestionBlock
        question="เรื่องนี้เป็นแนวไหน?"
        description="เลือกแนวหลักที่อธิบายเรื่องของคุณได้ดีที่สุด หนึ่งแนว"
        error={errors.primaryGenreId}
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {PRIMARY_GENRES.map((genre) => (
            <SelectableCard
              key={genre.id}
              item={genre}
              selected={draft.primaryGenreId === genre.id}
              onToggle={() => {
                update("primaryGenreId", draft.primaryGenreId === genre.id ? null : genre.id);
                update(
                  "secondaryGenreIds",
                  draft.secondaryGenreIds.filter((id) => id !== genre.id),
                );
              }}
            />
          ))}
        </div>
      </QuestionBlock>

      {draft.primaryGenreId ? (
        <QuestionBlock
          question="มีแนวอื่นร่วมด้วยไหม?"
          description={secondaryLeft > 0 ? `เลือกได้อีก ${secondaryLeft} แนว` : "เลือกครบแล้ว"}
          action={<SelectionCounter count={draft.secondaryGenreIds.length} max={STORY_LIMITS.secondaryGenresMax} unit="แนว" />}
        >
          <div className="flex flex-wrap gap-2">
            {PRIMARY_GENRES.filter((genre) => genre.id !== draft.primaryGenreId).map((genre) => {
              const selected = draft.secondaryGenreIds.includes(genre.id);
              return (
                <SelectableChip
                  key={genre.id}
                  label={genre.nameTh}
                  selected={selected}
                  disabled={!selected && secondaryLeft === 0}
                  onToggle={() =>
                    update(
                      "secondaryGenreIds",
                      selected
                        ? draft.secondaryGenreIds.filter((id) => id !== genre.id)
                        : [...draft.secondaryGenreIds, genre.id],
                    )
                  }
                />
              );
            })}
          </div>
        </QuestionBlock>
      ) : null}

      <QuestionBlock
        question="คู่หลักของเรื่องเป็นแบบไหน?"
        description="เลือกรูปแบบความสัมพันธ์หลักหนึ่งแบบ"
        error={errors.relationshipIds}
      >
        <div role="radiogroup" aria-label="คู่หลักของเรื่อง" className="grid gap-2 sm:grid-cols-2">
          {RELATIONSHIP_TYPES.map((type) => {
            const selected = draft.relationshipIds[0] === type.id;
            return (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update("relationshipIds", [type.id])}
                className={cn(
                  "tap-target flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left transition-colors duration-[var(--dur-fast)]",
                  selected ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card hover:border-[var(--brand-emphasis)]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                    selected ? "border-[var(--brand-emphasis)]" : "border-border",
                  )}
                >
                  {selected ? <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-emphasis)]" /> : null}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-semibold", selected && "text-[var(--brand-emphasis)]")}>
                    {type.nameTh}
                  </span>
                  <span className="block text-xs text-(--text-tertiary)">{type.nameEn}</span>
                </span>
              </button>
            );
          })}
        </div>
      </QuestionBlock>

      <QuestionBlock
        question="เรื่องเกิดขึ้นในโลกแบบไหน?"
        description="เลือกได้สูงสุด 2 แบบ"
        action={<SelectionCounter count={draft.settingIds.length} max={STORY_LIMITS.settingsMax} unit="โลก" />}
      >
        <SearchableChipSelector
          items={STORY_SETTINGS}
          selected={draft.settingIds}
          max={STORY_LIMITS.settingsMax}
          onChange={(next) => update("settingIds", next)}
          searchPlaceholder="ค้นหาฉาก เช่น มาเฟีย, ออฟฟิศ…"
          emptyText="ไม่เจอฉากที่ค้นหา ลองคำที่สั้นลง หรือเลือกจากรายการทั้งหมด"
        />
      </QuestionBlock>

      <QuestionBlock
        question="เรื่องนี้มีพล็อตหรือความสัมพันธ์แบบใดบ้าง?"
        description={`เลือก ${STORY_LIMITS.tropesRecommended}–${STORY_LIMITS.tropesMax} แบบที่ตรงกับเรื่องที่สุด เพื่อช่วยให้คนอ่านค้นพบเรื่องของคุณ`}
        error={errors.tropeIds}
        action={<SelectionCounter count={draft.tropeIds.length} max={STORY_LIMITS.tropesMax} />}
      >
        <SearchableChipSelector
          items={TROPES}
          selected={draft.tropeIds}
          max={STORY_LIMITS.tropesMax}
          onChange={(next) => update("tropeIds", next)}
          searchPlaceholder="ค้นหาพล็อต เช่น คลั่งรัก, มาเฟีย…"
          emptyText="ไม่เจอพล็อตที่ค้นหา ลองคำที่สั้นลง — รายการนี้ดูแลโดยทีมงาน จึงยังเพิ่มเองไม่ได้"
        />
        {draft.tropeIds.length > 0 && draft.tropeIds.length < STORY_LIMITS.tropesRecommended ? (
          <p className="text-xs leading-6 text-(--text-tertiary)">
            เลือกอีกสัก {STORY_LIMITS.tropesRecommended - draft.tropeIds.length} แบบจะช่วยให้ระบบแนะนำเรื่องคุณได้แม่นขึ้นมาก
          </p>
        ) : null}
      </QuestionBlock>
    </div>
  );
}

/* ── Step 3 ─────────────────────────────────────────────────────────── */

export function MatureContentForm({ draft, errors, update }: StepProps) {
  const selectedHeat = HEAT_LEVELS.find((item) => item.level === draft.heatLevel);

  function toggleWarning(id: string) {
    if (draft.noContentWarnings) return;
    update(
      "contentWarningIds",
      draft.contentWarningIds.includes(id)
        ? draft.contentWarningIds.filter((value) => value !== id)
        : [...draft.contentWarningIds, id],
    );
  }

  return (
    <div className="grid gap-8">
      <header>
        <h2 className="text-xl font-semibold sm:text-2xl">ช่วยให้ผู้อ่านรู้ว่าเรื่องนี้เข้มข้นแค่ไหน</h2>
        <p className="mt-1.5 text-sm leading-7 text-(--text-secondary)">
          ข้อมูลส่วนนี้ช่วยให้ NovelNow แนะนำเรื่องได้เหมาะกับผู้อ่าน และช่วยให้ผู้อ่านตัดสินใจก่อนเริ่มอ่าน
        </p>
      </header>

      <QuestionBlock
        question="🔥 ระดับความเข้มข้น"
        description="เลือกระดับที่ตรงกับเรื่องมากที่สุด หนึ่งระดับ"
        error={errors.heatLevel}
      >
        <div role="radiogroup" aria-label="ระดับความเข้มข้น" className="grid grid-cols-5 gap-2">
          {HEAT_LEVELS.map((item) => {
            const selected = draft.heatLevel === item.level;
            return (
              <button
                key={item.level}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`ระดับ ${item.level} ${item.nameTh}`}
                onClick={() => update("heatLevel", item.level)}
                className={cn(
                  "tap-target grid min-h-24 place-items-center gap-1 rounded-xl border px-1 py-3 transition-colors duration-[var(--dur-fast)]",
                  selected
                    ? "border-[var(--brand-emphasis)] bg-accent-subtle shadow-[var(--sh-brand)]"
                    : "border-border bg-card hover:border-[var(--brand-emphasis)]",
                )}
              >
                <span aria-hidden className="flex">
                  {Array.from({ length: item.level }).map((_, index) => (
                    <Flame
                      key={index}
                      className={cn("h-3.5 w-3.5", selected ? "text-[var(--brand-emphasis)]" : "text-(--text-tertiary)")}
                    />
                  ))}
                </span>
                <span className={cn("text-sm font-bold tabular-nums", selected && "text-[var(--brand-emphasis)]")}>
                  {item.level}
                </span>
                <span className="text-[11px] text-(--text-tertiary)">{item.shortTh}</span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite" className="rounded-xl bg-muted/50 p-4">
          {selectedHeat ? (
            <>
              <p className="text-sm font-semibold">
                ระดับ {selectedHeat.level} · {selectedHeat.nameTh}
              </p>
              <p className="mt-1 text-sm leading-7 text-(--text-secondary)">{selectedHeat.descriptionTh}</p>
            </>
          ) : (
            <p className="text-sm leading-7 text-(--text-secondary)">
              แตะที่ระดับด้านบนเพื่อดูคำอธิบาย เลือกตามเนื้อเรื่องจริง ไม่ต้องเลือกให้สูงหรือต่ำกว่าที่เป็น
            </p>
          )}
        </div>
      </QuestionBlock>

      <QuestionBlock
        question="มีเนื้อหาที่ควรแจ้งผู้อ่านหรือไม่?"
        description="เลือกเฉพาะสิ่งที่มีความสำคัญต่อเนื้อเรื่อง"
      >
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4">
          <input
            type="checkbox"
            checked={draft.noContentWarnings}
            onChange={(event) => {
              update("noContentWarnings", event.target.checked);
              if (event.target.checked) update("contentWarningIds", []);
            }}
            className="h-5 w-5 shrink-0 accent-[var(--brand-primary)]"
          />
          <span className="text-sm font-medium">ไม่มีคำเตือนเพิ่มเติม</span>
        </label>

        <div className={cn("flex flex-wrap gap-2", draft.noContentWarnings && "pointer-events-none opacity-40")}>
          {CONTENT_WARNINGS.map((warning) => (
            <SelectableChip
              key={warning.id}
              label={warning.nameTh}
              selected={draft.contentWarningIds.includes(warning.id)}
              disabled={draft.noContentWarnings}
              onToggle={() => toggleWarning(warning.id)}
            />
          ))}
        </div>
        <p className="text-xs leading-6 text-(--text-tertiary)">
          คำเตือนไม่ได้ทำให้เรื่องถูกลดการมองเห็น แต่ช่วยให้คนที่พร้อมอ่านเจอเรื่องคุณ และคนที่ไม่พร้อมได้เลือกเอง
        </p>
      </QuestionBlock>

      <QuestionBlock question="ยืนยันก่อนไปต่อ" error={errors.confirm}>
        <div className="grid gap-2">
          <label className="flex cursor-pointer gap-3 rounded-xl bg-muted/40 p-4">
            <input
              type="checkbox"
              checked={draft.contentAccuracyConfirmed}
              onChange={(event) => update("contentAccuracyConfirmed", event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-primary)]"
            />
            <span className="text-sm leading-7 text-(--text-secondary)">
              ฉันยืนยันว่าข้อมูลเกี่ยวกับระดับเนื้อหาและคำเตือนข้างต้นถูกต้องตามเนื้อเรื่อง
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-xl bg-muted/40 p-4">
            <input
              type="checkbox"
              checked={draft.contentPolicyConfirmed}
              onChange={(event) => update("contentPolicyConfirmed", event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-primary)]"
            />
            <span className="text-sm leading-7 text-(--text-secondary)">
              ฉันยืนยันว่าผลงานนี้เป็นไปตามนโยบายเนื้อหาของ NovelNow
            </span>
          </label>
        </div>
        <Link
          href="/terms"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
        >
          ดูนโยบายเนื้อหา 20+
          <ExternalLink aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </QuestionBlock>
    </div>
  );
}

/* ── Step 4 ─────────────────────────────────────────────────────────── */

export function ReviewAndRightsForm({
  draft,
  errors,
  update,
  onEditStep,
}: StepProps & { onEditStep: (step: number) => void }) {
  const licensed = draft.originType !== "original";

  return (
    <div className="grid gap-8">
      <header>
        <h2 className="text-xl font-semibold sm:text-2xl">พร้อมเปิดเรื่องแล้วหรือยัง?</h2>
        <p className="mt-1.5 text-sm leading-7 text-(--text-secondary)">
          ตรวจดูอีกครั้งว่าทุกอย่างตรงกับเรื่องของคุณ แก้ตรงไหนก็กดแก้ไขที่หัวข้อนั้นได้เลย
        </p>
      </header>

      <div className="grid gap-3">
        {[
          { step: 1, label: "ข้อมูลเรื่อง" },
          { step: 2, label: "แนวและสไตล์" },
          { step: 3, label: "เนื้อหา 20+" },
        ].map((section) => (
          <div key={section.step} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-sm font-medium">{section.label}</span>
            <button
              type="button"
              onClick={() => onEditStep(section.step)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
            >
              แก้ไข
            </button>
          </div>
        ))}
      </div>

      <StoryPreview draft={draft} />

      <QuestionBlock question="คุณจะลงเรื่องนี้ในรูปแบบไหน?">
        <div className="grid gap-2 sm:grid-cols-2">
          {STORY_TYPES.map((type) => {
            const selected = draft.storyType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update("storyType", type.id)}
                className={cn(
                  "tap-target min-h-16 rounded-xl border p-4 text-left transition-colors duration-[var(--dur-fast)]",
                  selected ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card hover:border-[var(--brand-emphasis)]",
                )}
              >
                <span className={cn("block text-sm font-semibold", selected && "text-[var(--brand-emphasis)]")}>
                  {type.nameTh}
                </span>
                <span className="mt-0.5 block text-xs text-(--text-tertiary)">{type.descriptionTh}</span>
              </button>
            );
          })}
        </div>
      </QuestionBlock>

      <Field label="สถานะของเรื่องตอนนี้">
        <Select value={draft.status} onChange={(event) => update("status", event.target.value)}>
          {STORY_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.nameTh}
            </option>
          ))}
        </Select>
      </Field>

      <QuestionBlock question="ผลงานนี้เป็นประเภทใด?" description="มีผลกับเอกสารสิทธิ์ที่เราอาจขอเพิ่มภายหลัง">
        <div className="grid gap-2">
          {CONTENT_ORIGINS.map((origin) => {
            const selected = draft.originType === origin.id;
            return (
              <button
                key={origin.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update("originType", origin.id)}
                className={cn(
                  "tap-target flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left transition-colors duration-[var(--dur-fast)]",
                  selected ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card hover:border-[var(--brand-emphasis)]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                    selected ? "border-[var(--brand-emphasis)]" : "border-border",
                  )}
                >
                  {selected ? <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-emphasis)]" /> : null}
                </span>
                <span className={cn("text-sm font-semibold", selected && "text-[var(--brand-emphasis)]")}>{origin.nameTh}</span>
              </button>
            );
          })}
        </div>

        {licensed ? (
          <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <Field label="ชื่อผลงานต้นฉบับ" error={errors.originalTitle}>
              <Input
                value={draft.originalTitle}
                invalid={Boolean(errors.originalTitle)}
                onChange={(event) => update("originalTitle", event.target.value)}
                placeholder="ชื่อในภาษาต้นทาง"
              />
            </Field>
            <Field label="เจ้าของลิขสิทธิ์">
              <Input
                value={draft.rightsHolder}
                onChange={(event) => update("rightsHolder", event.target.value)}
                placeholder="ชื่อผู้เขียนหรือสำนักพิมพ์"
              />
            </Field>
            <Field label="รายละเอียดสิทธิ์" hint="อัปโหลดเอกสารสิทธิ์เพิ่มภายหลังได้จากหน้าจัดการเรื่อง">
              <Textarea
                value={draft.rightsDetail}
                onChange={(event) => update("rightsDetail", event.target.value)}
                placeholder="เช่น ได้รับอนุญาตให้แปลและเผยแพร่ในภาษาไทยผ่านอีเมลลงวันที่…"
                className="min-h-24"
              />
            </Field>
          </div>
        ) : null}
      </QuestionBlock>

      <QuestionBlock question="ยืนยันสิทธิ์ในผลงาน" error={errors.rightsConfirmed}>
        <label className="flex cursor-pointer gap-3 rounded-xl bg-muted/40 p-4">
          <input
            type="checkbox"
            checked={draft.rightsConfirmed}
            onChange={(event) => update("rightsConfirmed", event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-primary)]"
          />
          <span className="text-sm leading-7 text-(--text-secondary)">
            ฉันยืนยันว่าฉันเป็นเจ้าของผลงาน หรือมีสิทธิ์ที่ถูกต้องในการเผยแพร่ผลงานนี้บน NovelNow
          </span>
        </label>
        <p className="text-xs leading-6 text-(--text-tertiary)">
          เรื่องจะถูกสร้างเป็นฉบับร่างก่อนเสมอ ยังไม่เผยแพร่ให้ใครเห็นจนกว่าคุณจะกดเผยแพร่เอง
        </p>
      </QuestionBlock>

      {draft.heatLevel ? (
        <p className="flex items-center gap-2 text-xs text-(--text-tertiary)">
          เรื่องนี้จะถูกจัดเป็น
          <HeatBadge level={draft.heatLevel} />
          และแสดงเฉพาะกับผู้อ่านที่ยืนยันอายุ 20 ปีขึ้นไป
        </p>
      ) : null}
    </div>
  );
}
