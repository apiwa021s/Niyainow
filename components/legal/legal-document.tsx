import { Logo } from "@/components/layout/logo";
import { PageHeader, PageShell } from "@/components/ui/section";

export type LegalSection = {
  title: string;
  body: string[];
};

export function LegalDocument({
  eyebrow,
  title,
  description,
  lastUpdated,
  sections,
  intro,
}: {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: readonly LegalSection[];
  intro?: string;
}) {
  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={<Logo />}
      />

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,720px)] lg:justify-between">
        <aside className="text-sm text-muted-foreground">
          <p className="editorial-kicker">DOCUMENT STATUS</p>
          <p className="mt-2 leading-6">Last updated<br /><span className="font-medium text-foreground">{lastUpdated}</span></p>
          <p className="mt-4">Effective date: <span className="font-medium text-foreground">{lastUpdated}</span></p>
        </aside>

        <article className="grid gap-10">
          {intro ? <p className="leading-8 text-muted-foreground">{intro}</p> : null}
          {sections.map((section, index) => (
            <section
              key={section.title}
              className="grid gap-3 border-b border-border py-7 sm:grid-cols-[44px_minmax(0,1fr)]"
            >
              <span className="tabular font-mono text-xs font-semibold text-[var(--brand-light-on-light)]">
                {(index + 1).toString().padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-xl font-semibold">{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="mt-3 leading-8 text-muted-foreground">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
    </PageShell>
  );
}
