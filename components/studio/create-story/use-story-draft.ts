"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SaveState } from "@/components/studio/create-story/wizard-chrome";

export type StoryDraft = {
  title: string;
  tagline: string;
  synopsis: string;
  coverUrl: string | null;
  coverName: string | null;
  coverKey: string | null;
  primaryGenreId: string | null;
  secondaryGenreIds: string[];
  relationshipIds: string[];
  settingIds: string[];
  tropeIds: string[];
  heatLevel: number | null;
  contentWarningIds: string[];
  noContentWarnings: boolean;
  contentAccuracyConfirmed: boolean;
  contentPolicyConfirmed: boolean;
  storyType: string;
  status: string;
  originType: string;
  originalTitle: string;
  rightsHolder: string;
  rightsDetail: string;
  rightsConfirmed: boolean;
};

export const emptyDraft: StoryDraft = {
  title: "",
  tagline: "",
  synopsis: "",
  coverUrl: null,
  coverName: null,
  coverKey: null,
  primaryGenreId: null,
  secondaryGenreIds: [],
  relationshipIds: [],
  settingIds: [],
  tropeIds: [],
  heatLevel: null,
  contentWarningIds: [],
  noContentWarnings: false,
  contentAccuracyConfirmed: false,
  contentPolicyConfirmed: false,
  storyType: "serial",
  status: "ongoing",
  originType: "original",
  originalTitle: "",
  rightsHolder: "",
  rightsDetail: "",
  rightsConfirmed: false,
};

/**
 * Where an unfinished draft lives between visits.
 *
 * Module scope, not localStorage: this project's standing rule is that studio UI
 * keeps state in memory only, so the draft survives navigating away to another
 * studio page and back — which is the case writers actually hit — and is gone on
 * a hard reload. Swap this object for the draft endpoint and the resume banner
 * keeps working unchanged.
 */
const session: { draft: StoryDraft | null; step: number } = { draft: null, step: 1 };

export function readResumableDraft() {
  if (!session.draft?.title.trim()) return null;
  return { draft: session.draft, step: session.step };
}

export function clearResumableDraft() {
  session.draft = null;
  session.step = 1;
}

export function useStoryDraft() {
  const [draft, setDraft] = useState<StoryDraft>(emptyDraft);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirtyRef = useRef(false);
  const timers = useRef<{ save?: number; settle?: number }>({});

  const update = useCallback(<K extends keyof StoryDraft>(key: K, value: StoryDraft[K]) => {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const replace = useCallback((next: StoryDraft) => {
    setDraft(next);
    dirtyRef.current = false;
  }, []);

  /** Debounced "save" against the in-memory store, with the two visible states. */
  useEffect(() => {
    if (!dirtyRef.current) return;
    const handles = timers.current;
    window.clearTimeout(handles.save);
    window.clearTimeout(handles.settle);

    handles.save = window.setTimeout(() => {
      setSaveState("saving");
      handles.settle = window.setTimeout(() => {
        session.draft = draft;
        setSaveState("saved");
      }, 450);
    }, 700);

    return () => {
      window.clearTimeout(handles.save);
      window.clearTimeout(handles.settle);
    };
  }, [draft]);

  const rememberStep = useCallback((step: number) => {
    session.step = step;
  }, []);

  return { draft, update, replace, saveState, rememberStep };
}

/* ── Validation ─────────────────────────────────────────────────────────
   Errors are computed per step and only shown once the writer has tried to
   move on, so nobody is told they are wrong before they have typed anything. */

export type StepErrors = Partial<Record<keyof StoryDraft | "confirm", string>>;

export function validateStep(step: number, draft: StoryDraft): StepErrors {
  const errors: StepErrors = {};

  if (step === 1) {
    if (!draft.title.trim()) errors.title = "ใส่ชื่อเรื่องก่อนไปขั้นตอนถัดไป";
    else if (draft.title.length > 120) errors.title = "ชื่อเรื่องยาวเกิน 120 ตัวอักษร";
  }

  if (step === 2) {
    if (!draft.primaryGenreId) errors.primaryGenreId = "กรุณาเลือกแนวหลักของเรื่อง";
    if (draft.relationshipIds.length === 0) errors.relationshipIds = "กรุณาเลือกรูปแบบคู่หลักของเรื่อง";
    if (draft.tropeIds.length === 0) errors.tropeIds = "เลือกพล็อตอย่างน้อย 1 แบบ เพื่อให้คนอ่านค้นเจอเรื่องของคุณ";
  }

  if (step === 3) {
    if (!draft.heatLevel) errors.heatLevel = "กรุณาเลือกระดับความเข้มข้นของเรื่อง";
    if (!draft.contentAccuracyConfirmed || !draft.contentPolicyConfirmed)
      errors.confirm = "กรุณายืนยันทั้งสองข้อก่อนไปขั้นตอนถัดไป";
  }

  if (step === 4) {
    if (!draft.rightsConfirmed) errors.rightsConfirmed = "กรุณายืนยันสิทธิ์ในผลงานก่อนสร้างเรื่อง";
    if (draft.originType !== "original" && !draft.originalTitle.trim())
      errors.originalTitle = "ระบุชื่อผลงานต้นฉบับสำหรับงานแปลหรือดัดแปลง";
  }

  return errors;
}
