export function ChapterContent({ paragraphs, teaser = false }: { paragraphs: string[]; teaser?: boolean }) {
  return paragraphs.map((paragraph, index) => (
    <p
      key={`${index}-${paragraph.slice(0, 24)}`}
      style={{ marginBottom: "var(--reader-paragraph-gap)" }}
      className={teaser && index === paragraphs.length - 1 ? "[mask-image:linear-gradient(to_bottom,black_20%,transparent_100%)]" : undefined}
    >
      {paragraph}
    </p>
  ));
}
