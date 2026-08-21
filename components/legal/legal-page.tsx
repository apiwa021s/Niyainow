import Link from "next/link";
import type { ReactNode } from "react";

import { InkUnderline } from "@/components/about/ink-underline";
import { Reveal } from "@/components/ui/reveal";
import { PageShell } from "@/components/ui/section";

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: readonly string[] }
  | { kind: "note"; text: string };

export type LegalArticle = {
  /** Anchor target, also used by the table of contents. */
  id: string;
  title: string;
  /** One plain-language line. Shown before the legal text so the section can be skimmed. */
  summary: string;
  blocks: readonly LegalBlock[];
};

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === "list") {
    return (
      <ul className="mt-3 grid gap-2.5">
        {block.items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-7 text-(--text-secondary)">
            <span aria-hidden className="mt-3 h-1 w-1 shrink-0 rounded-full bg-brand-primary" />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "note") {
    return (
      <p className="mt-4 border-l-2 border-[var(--brand-emphasis)] bg-muted/40 px-4 py-3 text-sm leading-7 text-(--text-secondary)">
        {block.text}
      </p>
    );
  }

  return <p className="mt-3 text-sm leading-7 text-(--text-secondary)">{block.text}</p>;
}

/**
 * Layout for the policy documents. Two things make a legal page usable rather
 * than merely present: a table of contents that survives on a phone, and a
 * plain-language line at the top of every section so a reader can decide
 * whether the paragraph below is worth their time.
 */
export function LegalPage({
  eyebrow,
  title,
  description,
  version,
  effectiveDate,
  lastUpdated,
  articles,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  articles: readonly LegalArticle[];
  footer?: ReactNode;
}) {
  return (
    <PageShell className="max-w-5xl">
      <Reveal as="section" className="py-4 sm:py-8">
        <p className="editorial-kicker">{eyebrow}</p>
        <h1 className="mt-2 text-h1 font-semibold sm:text-display">{title}</h1>
        <InkUnderline className="mt-1 max-w-64" />
        <p className="mt-4 max-w-2xl text-body text-(--text-secondary)">{description}</p>
        <p className="mt-4 text-xs text-(--text-tertiary)">
          เวอร์ชัน {version} · มีผลตั้งแต่ {effectiveDate} · ปรับปรุงล่าสุด {lastUpdated}
        </p>
      </Reveal>

      <Reveal as="section" aria-labelledby="toc-title" className="mt-4">
        <nav className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 id="toc-title" className="text-sm font-semibold">
            สารบัญ
          </h2>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {articles.map((article, index) => (
              <li key={article.id} className="flex gap-3 text-sm">
                <span aria-hidden className="font-mono text-xs text-(--text-tertiary) tabular-nums">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <Link
                  href={`#${article.id}`}
                  className="min-w-0 py-1 text-(--text-secondary) underline-offset-4 hover:text-[var(--brand-emphasis)] hover:underline"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:mt-10">
        {articles.map((article, index) => (
          <Reveal as="section" key={article.id} aria-labelledby={`${article.id}-title`}>
            {/* scroll-mt clears the sticky topbar when a TOC link jumps here. */}
            <article id={article.id} className="scroll-mt-24 rounded-xl border border-border bg-card p-5 sm:p-7">
              <div className="flex gap-4">
                <span aria-hidden className="font-mono text-xs font-semibold text-[var(--brand-emphasis)] tabular-nums">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id={`${article.id}-title`} className="text-xl font-semibold">
                    {article.title}
                  </h2>
                  <p className="mt-2 rounded-[8px] bg-accent-subtle px-3 py-2 text-sm leading-6 text-(--text-secondary)">
                    <span className="font-semibold text-[var(--brand-emphasis)]">สรุปสั้น ๆ · </span>
                    {article.summary}
                  </p>
                  {article.blocks.map((block, blockIndex) => (
                    <Block key={blockIndex} block={block} />
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      {footer ? <Reveal as="section" className="mt-8">{footer}</Reveal> : null}
    </PageShell>
  );
}
