import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  FONT_SIZE_SCALE,
  LINE_HEIGHT_VALUES,
  READER_FONT_KIND,
  READER_FONT_LABELS,
  READER_FONTS,
  READER_THEME_LABELS,
  READER_THEMES,
  WIDTH_VALUES,
} from "@/lib/reader/prefs";

export const metadata: Metadata = {
  title: "Type spec",
  robots: { index: false, follow: false },
};

/**
 * The QA sample from the brief. It is deliberately nasty:
 *   - ปุ๋ย / ญี่ปุ่น / เกี๊ยะ fill all four vertical levels at once
 *   - ฏิฐิ stacks a lower vowel under a tall consonant
 *   - ฤๅ ๆ ฯลฯ are the characters bad subsets drop first
 *   - the URL is the only run in the page that may legitimately hard-break
 *   - the dialogue line is what 90% of the product actually looks like
 */
const SAMPLE = [
  "ปุ๋ยญี่ปุ่นเกี๊ยะฏิฐิอึ๋ยหนึ่งก็ฤๅๆฯลฯ",
  "“เธอจะไปไหน” เขาถามเสียงเบา ก่อนจะหันไปมองท้องฟ้าที่กำลังเปลี่ยนสี",
  "ผมส่งลิงก์ https://example.com/very/long/path?query=1 ให้เธอดู แล้วบอกว่า OK",
];

const URL_SPLIT = /(https?:\/\/\S+)/g;

function Sample() {
  return (
    <div className="read-body" lang="th">
      {SAMPLE.map((line, index) => (
        <p key={index}>
          {line.split(URL_SPLIT).map((part, partIndex) =>
            part.startsWith("http")
              ? <span key={partIndex} data-read-url lang="en">{part}</span>
              : part,
          )}
        </p>
      ))}
      <hr className="read-break" aria-hidden />
      <p>ย่อหน้าหลังตัวคั่นฉาก ใช้ตรวจว่าเส้นคั่นและระยะหายใจได้สัดส่วนกับขนาดตัวอักษร</p>
    </div>
  );
}

function Panel({
  label,
  note,
  style,
  theme,
}: {
  label: string;
  note?: string;
  style?: React.CSSProperties;
  theme?: string;
}) {
  return (
    <figure
      data-read-theme={theme}
      className="m-0 overflow-hidden rounded-[8px] border"
      style={{ background: "var(--read-bg)", borderColor: "var(--read-border)", ...style }}
    >
      <figcaption
        className="flex items-baseline justify-between gap-3 border-b px-4 py-2 text-xs"
        style={{ borderColor: "var(--read-border)", color: "var(--read-muted)" }}
      >
        <span className="font-semibold">{label}</span>
        {note ? <span className="tabular">{note}</span> : null}
      </figcaption>
      <div className="px-5 py-5">
        <Sample />
      </div>
    </figure>
  );
}

function Section({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="text-h2 font-semibold">{title}</h2>
      <p className="mt-1 max-w-[60ch] text-sm text-(--text-secondary)">{blurb}</p>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

/**
 * Every reading variable, on one page, with the test string that breaks
 * careless Thai typography. Development only — it exists so a regression is
 * caught by looking rather than by a reader complaining.
 */
export default function TypeSpecPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main id="main" className="mx-auto max-w-[1100px] px-5 py-12">
      <h1 className="text-display font-semibold">Type spec</h1>
      <p className="mt-2 max-w-[60ch] text-sm text-(--text-secondary)">
        ข้อความทดสอบชุดเดียวกันทุกแผง — ครบทั้งสระบน สระล่าง วรรณยุกต์ซ้อน ตัวอักษรหายาก
        และลิงก์ยาว กติกาทั้งหมดอยู่ใน <code>docs/TYPOGRAPHY.md</code>
      </p>

      <Section
        title="Before / after"
        blurb="ซ้ายคือค่าที่ลอกมาจาก typography ฝรั่งโดยตรง ขวาคือค่าปัจจุบัน สังเกตว่าวรรณยุกต์บรรทัดบนเกือบชนสระล่างของบรรทัดล่างในแผงซ้าย"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            label="Before — Latin defaults"
            note="16px · 1.5 · 0.01em"
            theme="light"
            style={
              {
                "--read-size": "16px",
                "--read-leading": "1.5",
                "--read-para-gap": "0.8em",
              } as React.CSSProperties
            }
          />
          <Panel
            label="After — Thai defaults"
            note="19px · 1.85 · 0"
            theme="light"
            style={{ "--read-size": "19px", "--read-leading": "1.85" } as React.CSSProperties}
          />
        </div>
      </Section>

      <Section title="ธีม" blurb="ทั้งสี่ธีมผ่าน WCAG AA — ยืนยันด้วย tests/reader-typography.test.ts ไม่ใช่สายตา ธีมมืดใช้น้ำหนัก 500 เพื่อกันวรรณยุกต์จาง">
        <div className="grid gap-5 sm:grid-cols-2">
          {READER_THEMES.map((theme) => (
            <Panel key={theme} theme={theme} label={READER_THEME_LABELS[theme]} note={theme} />
          ))}
        </div>
      </Section>

      <Section title="ขนาด" blurb="แปดระดับ ค่าเริ่มต้นคือ 19px บนมือถือ (index 3) และ +1px บนเดสก์ท็อป">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FONT_SIZE_SCALE.map((size, index) => (
            <Panel
              key={size}
              theme="light"
              label={`${size}px`}
              note={`index ${index}`}
              style={{ "--read-size": `${size}px` } as React.CSSProperties}
            />
          ))}
        </div>
      </Section>

      <Section title="ระยะบรรทัด" blurb="ขั้นต่ำคือ 1.65 ไม่ใช่ 1.5 เพราะไทยซ้อนสี่ชั้น">
        <div className="grid gap-5 lg:grid-cols-3">
          {Object.entries(LINE_HEIGHT_VALUES).map(([name, value]) => (
            <Panel
              key={name}
              theme="light"
              label={name}
              note={String(value)}
              style={{ "--read-leading": String(value) } as React.CSSProperties}
            />
          ))}
        </div>
      </Section>

      <Section title="ฟอนต์" blurb="ค่าเริ่มต้นเป็นแบบมีหัว หัวอักษรคือจุดสังเกตที่ตาใช้แยกตัวอักษรตอนอ่านเร็ว">
        <div className="grid gap-5 lg:grid-cols-3">
          {READER_FONTS.map((font) => (
            <Panel
              key={font}
              theme="light"
              label={READER_FONT_LABELS[font]}
              note={READER_FONT_KIND[font]}
              style={{ "--read-family": `var(--font-read-${font})` } as React.CSSProperties}
            />
          ))}
        </div>
      </Section>

      <Section title="ความกว้าง" blurb="เดสก์ท็อปเลือกได้สามระดับ ประมาณ 58–66 ตัวอักษรไทยต่อบรรทัดที่ 20px">
        <div className="grid gap-5">
          {Object.entries(WIDTH_VALUES).map(([name, value]) => (
            <Panel
              key={name}
              theme="light"
              label={name}
              note={value}
              style={{ "--read-measure": value } as React.CSSProperties}
            />
          ))}
        </div>
      </Section>

      <Section title="รูปแบบย่อหน้า" blurb="เว้นระยะ หรือ ย่อหน้าแรกบรรทัด — เลือกอย่างใดอย่างหนึ่ง ห้ามใช้พร้อมกัน">
        <div className="grid gap-5 lg:grid-cols-2">
          <div data-read-paragraph="gap">
            <Panel theme="light" label="เว้นระยะ" note="--read-para-gap" />
          </div>
          <div data-read-paragraph="indent">
            <Panel theme="light" label="ย่อหน้า" note="--read-indent" />
          </div>
        </div>
      </Section>

      <Section
        title="320px"
        blurb="คอลัมน์แคบสุดที่รองรับ ตรวจว่าไม่มีการตัดกลางคำไทย และลิงก์ยาวไม่ดันขอบจอ"
      >
        <div className="w-[320px] max-w-full border" style={{ borderColor: "var(--border-color)" }}>
          <Panel theme="light" label="320px" note="narrowest supported" />
        </div>
      </Section>
    </main>
  );
}
