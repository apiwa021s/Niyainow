import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DIM_MAX, LINE_HEIGHT_VALUES } from "@/stores/use-reader-store";

const tokens = readFileSync("app/tokens.css", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const stylesheets = `${tokens}${globals}`;

/** WCAG 2.x relative luminance. */
function luminance(hex: string) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => {
    const c = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Composite a colour under an opaque black veil at the given opacity. */
function dimmed(hex: string, opacity: number) {
  const value = hex.replace("#", "");
  const parts = [0, 2, 4].map((offset) => {
    const channel = Math.round(parseInt(value.slice(offset, offset + 2), 16) * (1 - opacity));
    return channel.toString(16).padStart(2, "0");
  });
  return `#${parts.join("")}`;
}

/** Slice one `[data-read-theme="x"] { ... }` block out of tokens.css. */
function themeBlock(theme: string) {
  const start = tokens.indexOf(`[data-read-theme="${theme}"] {`);
  expect(start, `missing theme block for ${theme}`).toBeGreaterThan(-1);
  return tokens.slice(start, tokens.indexOf("}", start));
}

function themeToken(theme: string, token: string) {
  const line = themeBlock(theme)
    .split("\n")
    .find((row) => row.trim().startsWith(`--${token}:`));
  const value = line?.match(/#[0-9a-f]{6}/i)?.[0];
  expect(value, `missing --${token} in ${theme}`).toBeTruthy();
  return value!;
}

/** Slice a rule out of globals.css by its selector text. */
function rule(selector: string) {
  const start = globals.indexOf(selector);
  expect(start, `missing rule ${selector}`).toBeGreaterThan(-1);
  return globals.slice(start, globals.indexOf("}", start));
}

const THEMES = ["light", "sepia", "dark", "amoled"] as const;

describe("reader theme contrast", () => {
  it.each(THEMES)("clears WCAG AA for body text in %s", (theme) => {
    expect(contrast(themeToken(theme, "read-text"), themeToken(theme, "read-bg"))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(THEMES)("clears WCAG AA for secondary text in %s", (theme) => {
    expect(contrast(themeToken(theme, "read-muted"), themeToken(theme, "read-bg"))).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * The night-dimming veil darkens text and ground together, which still costs
   * contrast. DIM_MAX is only defensible if AA survives at the bottom of the
   * range — otherwise the control quietly makes the reader unreadable.
   */
  it.each(THEMES)("stays above AA in %s at maximum dimming", (theme) => {
    const text = dimmed(themeToken(theme, "read-text"), DIM_MAX);
    const bg = dimmed(themeToken(theme, "read-bg"), DIM_MAX);
    expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps light themes off pure black and dark themes off pure white", () => {
    expect(themeToken("dark", "read-text")).not.toBe("#ffffff");
    expect(themeToken("light", "read-text")).not.toBe("#000000");
    expect(themeToken("light", "read-bg")).not.toBe("#ffffff");
  });

  it("steps the weight up on dark grounds so tone marks do not thin out", () => {
    for (const theme of ["dark", "amoled"] as const) {
      expect(themeBlock(theme)).toMatch(/--read-weight:\s*500/);
    }
  });
});

describe("Thai line-breaking rules", () => {
  it("never justifies anywhere in the stylesheets", () => {
    // Thai has no inter-word spaces to absorb the stretch, so justification
    // distorts the glyph run instead of the gaps.
    expect(stylesheets).not.toMatch(/text-align:\s*justify/);
  });

  it("never opts into a break that can land mid-word", () => {
    expect(stylesheets).not.toMatch(/word-break:\s*break-word/);
    expect(stylesheets).not.toMatch(/overflow-wrap:\s*anywhere/);
  });

  it("scopes the one legitimate hard break to URLs and code", () => {
    const urlRule = rule(".read-body a,");
    expect(urlRule).toMatch(/word-break:\s*break-all/);
    expect(urlRule).toMatch(/data-read-url/);
  });

  it("holds body tracking at zero and leaves word breaking to the browser", () => {
    const body = rule(".read-body {");
    expect(body).toMatch(/letter-spacing:\s*0;/);
    expect(body).toMatch(/word-break:\s*normal/);
    expect(body).toMatch(/text-align:\s*start/);
    expect(body).toMatch(/text-wrap:\s*pretty/);
  });
});

describe("Thai vertical metrics", () => {
  it("keeps every leading option above the Thai floor", () => {
    // 1.5-1.6 is a Latin figure. Thai stacks four levels and needs more.
    for (const value of Object.values(LINE_HEIGHT_VALUES)) {
      expect(value).toBeGreaterThanOrEqual(1.65);
    }
    expect(LINE_HEIGHT_VALUES.normal).toBe(1.85);
  });

  it("leaves headline leading room for stacked tone marks", () => {
    const leading = Number(tokens.match(/--read-title-leading:\s*([\d.]+)/)![1]);
    expect(leading).toBeGreaterThanOrEqual(1.35);
  });

  it("uses a gap or an indent for paragraphs, never both at once", () => {
    const gapMode = tokens.slice(tokens.indexOf('[data-read-paragraph="gap"]'));
    const indentMode = tokens.slice(tokens.indexOf('[data-read-paragraph="indent"]'));
    expect(gapMode.slice(0, gapMode.indexOf("}"))).toMatch(/--read-indent:\s*0/);
    expect(indentMode.slice(0, indentMode.indexOf("}"))).toMatch(/--read-para-gap:\s*0/);
  });
});
