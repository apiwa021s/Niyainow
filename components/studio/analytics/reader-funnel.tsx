import { StudioPanel } from "@/components/studio/studio-ui";

/**
 * What actually helps a writer isn't the raw view count — it's whether
 * readers kept going (spec §26). Two plain-language sentences beat a
 * funnel chart here, so nothing gets built that only a data analyst reads.
 */
export function ReaderFunnel({
  previousLabel,
  previousViews,
  currentLabel,
  currentViews,
  currentUnlocks,
  nextLabel,
  nextViews,
}: {
  previousLabel?: string;
  previousViews?: number;
  currentLabel: string;
  currentViews: number;
  currentUnlocks: number;
  nextLabel?: string;
  nextViews?: number;
}) {
  const continuedFromPrevious =
    previousViews && previousViews > 0 ? Math.round((currentViews / previousViews) * 100) : null;
  const continuedToNext = nextViews && currentUnlocks > 0 ? Math.round((nextViews / currentUnlocks) * 100) : null;

  if (continuedFromPrevious === null && continuedToNext === null) return null;

  return (
    <StudioPanel title="คนอ่านต่อแค่ไหน" description="เทียบยอดอ่านและปลดล็อกกับตอนข้างเคียง">
      <ul className="grid gap-3 p-5 text-sm leading-7">
        {continuedFromPrevious !== null ? (
          <li>
            <span className="font-semibold tabular-nums text-brand-primary">{continuedFromPrevious}%</span> ของคนที่อ่าน{" "}
            {previousLabel} เปิดอ่าน {currentLabel} ต่อ
          </li>
        ) : null}
        {continuedToNext !== null ? (
          <li>
            <span className="font-semibold tabular-nums text-brand-primary">{continuedToNext}%</span> ของผู้ที่ปลดล็อก{" "}
            {currentLabel} อ่าน {nextLabel} ต่อ
          </li>
        ) : null}
      </ul>
    </StudioPanel>
  );
}
