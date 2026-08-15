export function ChapterContent({ paragraphs, teaser = false }: { paragraphs: string[]; teaser?: boolean }) {
  return paragraphs.map((paragraph, index) => (
    <p
      key={`${index}-${paragraph.slice(0, 24)}`}
      data-reader-paragraph={index}
      style={{ marginBottom: "var(--reader-paragraph-gap)" }}
      className={`whitespace-pre-line ${teaser && index === paragraphs.length - 1 ? "opacity-40" : ""}`}
    >
      {paragraph}
    </p>
  ));
}
