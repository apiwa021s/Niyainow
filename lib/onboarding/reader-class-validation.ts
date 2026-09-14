import { z } from "zod";

import { getReaderClass, type ReaderClassId } from "./reader-class";

const readerClassIdSchema = z.custom<ReaderClassId>(
  (value) => typeof value === "string" && Boolean(getReaderClass(value)),
  "Reader Class ไม่ถูกต้อง",
);

const quizAnswersSchema = z.object({
  hero: z.enum(["overpowered", "growth", "strategist", "antihero"]),
  pace: z.enum(["binge", "stack", "daily", "complete"]),
  hook: z.enum(["chemistry", "new_world", "comeback", "secret"]),
}).strict();

export const readerClassProfileInputSchema = z.object({
  version: z.literal(1),
  classId: readerClassIdSchema,
  subClassId: readerClassIdSchema,
  selectedClassIds: z.array(readerClassIdSchema).length(3),
  answers: quizAnswersSchema,
  completedAt: z.iso.datetime({ offset: true }),
}).superRefine((profile, context) => {
  const selected = new Set(profile.selectedClassIds);
  if (selected.size !== profile.selectedClassIds.length) {
    context.addIssue({ code: "custom", path: ["selectedClassIds"], message: "Class ที่เลือกต้องไม่ซ้ำกัน" });
  }
  if (!selected.has(profile.classId) || !selected.has(profile.subClassId)) {
    context.addIssue({ code: "custom", path: ["selectedClassIds"], message: "Main และ Sub Class ต้องอยู่ใน Class ที่เลือก" });
  }
  if (profile.classId === profile.subClassId) {
    context.addIssue({ code: "custom", path: ["subClassId"], message: "Main และ Sub Class ต้องไม่ซ้ำกัน" });
  }
});

export type ReaderClassProfileInput = z.infer<typeof readerClassProfileInputSchema>;
