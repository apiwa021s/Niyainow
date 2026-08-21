import { chapterStatusLabels, type StudioChapter } from "@/components/studio/mock-data";
import { StatusPill } from "@/components/studio/studio-ui";

export function ChapterStatusBadge({ status }: { status: StudioChapter["status"] }) {
  const { label, dot } = chapterStatusLabels[status];
  return <StatusPill label={label} dot={dot} />;
}
