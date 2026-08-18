export function ChapterContent({ paragraphs, teaser = false }: { paragraphs: string[]; teaser?: boolean }) {
  return (
    <div className="[&>p]:mb-[var(--reader-paragraph-gap)] [&>p]:whitespace-pre-line [&>p]:[contain-intrinsic-size:auto_5rem] [&>p]:[content-visibility:auto] [&>p:last-child]:mb-0">
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${index}-${paragraph.slice(0, 24)}`}
          data-reader-paragraph={index}
          className={teaser && index === paragraphs.length - 1 ? "opacity-40" : undefined}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
