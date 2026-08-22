"use client";

import { ArrowRight, Check, CircleAlert, PenLine, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  GenreAndStyleForm,
  MatureContentForm,
  ReviewAndRightsForm,
  StoryBasicInfoForm,
} from "@/components/studio/create-story/steps";
import { StoryPreview, StorySummaryCard } from "@/components/studio/create-story/story-preview";
import {
  clearResumableDraft,
  readResumableDraft,
  useStoryDraft,
  validateStep,
  type StepErrors,
} from "@/components/studio/create-story/use-story-draft";
import {
  AutosaveStatus,
  StickyWizardNavigation,
  WIZARD_STEPS,
  WizardStepper,
} from "@/components/studio/create-story/wizard-chrome";
import { Button, ButtonLink } from "@/components/ui/button";

export function CreateStoryWizard() {
  const { draft, update, replace, saveState, rememberStep } = useStoryDraft();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<StepErrors>({});
  const [created, setCreated] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [resumable, setResumable] = useState(() => readResumableDraft());

  function goTo(next: number) {
    setStep(next);
    setErrors({});
    rememberStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleNext() {
    const found = validateStep(step, draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    if (step < WIZARD_STEPS.length) {
      goTo(step + 1);
      return;
    }

    setCreating(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/studio/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          tagline: draft.tagline.trim() || null,
          synopsis: draft.synopsis.trim(),
          coverKey: draft.coverKey,
          primaryGenreId: draft.primaryGenreId,
          secondaryGenreIds: draft.secondaryGenreIds,
          relationshipIds: draft.relationshipIds,
          settingIds: draft.settingIds,
          tropeIds: draft.tropeIds,
          heatLevel: draft.heatLevel,
          contentWarningIds: draft.contentWarningIds,
          storyType: draft.storyType,
          storyStatus: draft.status === "hiatus" ? "paused" : draft.status,
          originType: draft.originType,
          originalTitle: draft.originalTitle.trim() || null,
          rightsHolder: draft.rightsHolder.trim() || null,
          rightsNote: draft.rightsDetail.trim() || null,
          rightsDocumentReference: null,
          rightsConfirmed: draft.rightsConfirmed,
          contentPolicyConfirmed: draft.contentPolicyConfirmed,
        }),
      });
      const payload = await response.json() as { data?: { slug: string }; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "สร้างเรื่องไม่สำเร็จ");
      clearResumableDraft();
      setCreatedSlug(payload.data.slug);
      setCreated(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "สร้างเรื่องไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setCreating(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto grid max-w-lg justify-items-center gap-4 rounded-xl border border-border bg-card p-8 text-center sm:p-12">
        <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-accent-subtle text-brand-primary">
          <Check className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-semibold">สร้างเรื่องเรียบร้อยแล้ว</h1>
        <p className="max-w-sm leading-7 text-(--text-secondary)">
          “{draft.title}” พร้อมแล้ว ต่อไปมาเริ่มเขียนตอนแรกกัน
        </p>
        <div className="mt-2 grid w-full gap-2 sm:w-auto sm:grid-flow-col">
          <ButtonLink href={`/studio/works/${createdSlug}/chapters/new`} variant="primary">
            <PenLine aria-hidden className="h-4 w-4" />
            เขียนตอนแรก
          </ButtonLink>
          <ButtonLink href="/studio/works" variant="outline">
            กลับหน้าจัดการเรื่อง
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Resume banner — the draft is still in memory from an earlier visit. */}
      {resumable && draft.title === "" ? (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl bg-accent-subtle p-4 sm:p-5">
          <Sparkles aria-hidden className="h-5 w-5 shrink-0 text-brand-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">คุณมีเรื่องที่ยังสร้างไม่เสร็จ</p>
            <p className="mt-0.5 truncate text-sm text-(--text-secondary)">
              {resumable.draft.title} · ขั้นตอน {resumable.step} จาก {WIZARD_STEPS.length}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                replace(resumable.draft);
                goTo(resumable.step);
                setResumable(null);
              }}
            >
              ทำต่อ
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                clearResumableDraft();
                setResumable(null);
              }}
            >
              เริ่มใหม่
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <WizardStepper current={step} onJump={goTo} />
        </div>
        <AutosaveStatus state={saveState} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0">
          {step === 1 ? <StoryBasicInfoForm draft={draft} errors={errors} update={update} /> : null}
          {step === 2 ? <GenreAndStyleForm draft={draft} errors={errors} update={update} /> : null}
          {step === 3 ? <MatureContentForm draft={draft} errors={errors} update={update} /> : null}
          {step === 4 ? (
            <ReviewAndRightsForm draft={draft} errors={errors} update={update} onEditStep={goTo} />
          ) : null}

          {submitError ? (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-[6px] border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {submitError}
            </p>
          ) : null}

          <StickyWizardNavigation
            onBack={step > 1 ? () => goTo(step - 1) : undefined}
            onNext={handleNext}
            nextLabel={step === WIZARD_STEPS.length ? (creating ? "กำลังสร้างเรื่อง…" : "สร้างเรื่อง") : "ต่อไป"}
            nextDisabled={creating}
            secondary={
              step === 1 ? (
                <Button type="button" variant="outline">
                  <Save aria-hidden className="h-4 w-4" />
                  <span className="hidden sm:inline">บันทึกเป็น Draft</span>
                  <span className="sm:hidden">Draft</span>
                </Button>
              ) : null
            }
          />
        </div>

        {/* Step 1 gets the live card; steps 2–3 get the running summary. Step 4
            already shows the full preview inside the form. */}
        <aside className="hidden lg:sticky lg:top-20 lg:grid lg:gap-4">
          {step === 1 ? <StoryPreview draft={draft} compact /> : null}
          {step === 2 || step === 3 ? (
            <>
              <StorySummaryCard draft={draft} />
              <StoryPreview draft={draft} compact />
            </>
          ) : null}
          {step === 4 ? (
            <div className="rounded-xl bg-accent-subtle p-4">
              <p className="text-sm font-semibold text-[var(--brand-emphasis)]">ใกล้เสร็จแล้ว</p>
              <p className="mt-1.5 text-sm leading-7 text-(--text-secondary)">
                กด “สร้างเรื่อง” แล้วเรื่องจะถูกบันทึกเป็นฉบับร่าง คุณเลือกเองได้ว่าจะเผยแพร่เมื่อไหร่
              </p>
              <Link
                href="/creators"
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
              >
                ดูเงื่อนไขส่วนแบ่งรายได้
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
