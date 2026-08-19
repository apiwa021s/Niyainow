# Typography — Thai reading rules

The goal this file serves: **a reader stays in a chapter for 45 minutes without
eye strain and without noticing the UI.** Anything that does not serve that is
not a typography decision worth making here.

Thai is not Latin with different glyphs. It stacks four vertical levels, has no
spaces between words, has no capital letters, and its fonts routinely ship
non-standard metrics. Most typographic advice you will find online assumes none
of that is true.

Everything below is enforced by `tests/reader-typography.test.ts`. If you change
a value, run the tests before you trust your eyes.

---

## 1. Where the values live

| Layer | File | What it owns |
|---|---|---|
| Tokens | `app/tokens.css` | Every reading size, leading, measure, and theme colour |
| Rules | `app/globals.css` (`.read-body` and friends) | How those tokens are applied |
| State | `stores/use-reader-store.ts` | The scales a reader can pick from |
| Behaviour | `hooks/use-reader-prefs.ts` | Applying a choice, and syncing it |
| First paint | `components/reader/reader-prefs-script.tsx` | Applying it before React exists |

**One source of truth.** A colour is defined in `tokens.css` and nowhere else.
Before this refactor the theme colours existed in both TypeScript and CSS, the
two drifted, and the inline copy silently won — which is also what made a
flash-free first paint impossible.

---

## 2. Vertical space

Thai stacks: lower vowel (ุ ู) → base glyph → upper vowel (ิ ี ึ ื ั) → tone mark
(่ ้ ๊ ๋). Words like **ปุ๋ย / ญี่ปุ่น / เกี๊ยะ** use every level at once.

- Body leading: **1.85** default; 1.65 / 1.85 / 2.05 selectable.
- **Never below 1.65.** The familiar 1.5–1.6 figure is calibrated for Latin.
- Headings: **1.35–1.45**. A heading is exactly where stacked marks appear; 1.0–1.2 clips them.
- Buttons, badges, chips, toasts: never `line-height: 1` together with a clipped
  overflow box (`truncate`, `overflow: hidden`). That combination is how tone
  marks lose their heads, and it is invisible in Latin-only testing.

## 3. Line breaking

There are no inter-word spaces, so the browser has to use its Thai dictionary —
and it only does that when nothing has overridden the break rules.

```css
/* correct */
word-break: normal;
overflow-wrap: normal;
text-align: start;    /* ragged right */
text-wrap: pretty;    /* no orphaned last line */

/* wrong — breaks mid-word or mid-syllable */
word-break: break-all;
word-break: break-word;
overflow-wrap: anywhere;
text-align: justify;  /* no spaces to stretch, so the glyph run stretches instead */
```

- `<html lang="th">` is required. Latin runs inside Thai copy get `lang="en"`.
- `overflow-wrap: break-word` on `body` "to stop overflow" is the single most
  common way to wreck Thai text. Scope the hard break to the elements that
  actually need it — URLs and code — as `.read-body a, [data-read-url]` does.
- Long headings: `text-wrap: balance`.
- If dictionary breaking is ever not good enough, inject `&#8203;` (ZWSP) at
  render time, in one layer. **Never store ZWSP in the database** — it breaks
  search and copy-paste.

## 4. Letter-spacing

Body Thai is **`letter-spacing: 0`. Always.** Positive tracking pulls vowels and
tone marks off the base glyph they belong to; negative tracking collides them.
Tracking is only ever acceptable on uppercase Latin labels.

## 5. Hierarchy

Thai has no capital letters, so `text-transform: uppercase` does nothing to Thai
and mangles mixed labels. `:lang(th)` neutralises it globally, but do not reach
for it — build hierarchy from **size, weight, colour, and spacing** only.

## 6. Optical size

At equal px, Thai reads smaller than Latin: lower relative x-height, and the
loops consume counter space. Thai body text needs to be **10–15% larger** than
the Latin figure you would otherwise reach for.

- Default **19px mobile / 20px desktop**. Not 16px.
- Scale: `16 · 17 · 18 · 19 · 20 · 22 · 24 · 28`, stored as an index (default 3).

## 7. Measure

- Desktop: 600 / 680 / 780px, default 680 — roughly 58–66 Thai characters per line at 20px.
- Mobile: at least 20px of side padding. Below 16px the thumb covers the text.

## 8. Choosing a face

| Role | Face | Why |
|---|---|---|
| **Body, default** | IBM Plex Sans Thai **Looped** | The loops are landmarks the eye uses to separate glyphs at reading speed. Less fatiguing over long sessions, and materially easier for older readers. |
| Body, option | IBM Plex Sans Thai (loopless) | For readers who want the modern look. **Never the default.** |
| Body, option | Noto Serif Thai | Book feel; suits period and literary fiction. |
| UI, headings | IBM Plex Sans Thai | Never follows the reader's font choice. |

Three families, maximum. Three weights per family, maximum.

**Never use a display face for body text** — Kanit, Prompt, Mitr, Chakra Petch
are designed to be looked at, not read through.

## 9. Metrics and CLS

- Load through `next/font` with `subsets: ['thai', 'latin']`, `display: 'swap'`,
  and `adjustFontFallback: true`. The last one matters more here than in
  Latin-only work, because Thai ascent/descent values are so often non-standard.
- Preload only the one weight the body actually uses.
- A subset must cover **U+0E00–0E7F in full**. Trimming "unused" ranges drops
  combining marks and silently corrupts words.

## 10. Dark themes

Thai tone marks are hairlines. On a dark ground they optically thin and start to
vanish.

- Step the weight up (400 → 500) on `dark` and `amoled`.
- Set `-webkit-font-smoothing: antialiased`.
- Never render body text below 0.85 opacity.
- Never `#FFF` on `#000` — that is a glare source, not contrast.

## 11. Colour

Four themes, no more: Light, Sepia, Dark, AMOLED. Every foreground/background
pair clears WCAG AA (4.5:1); body pairs clear AAA. Verify with the test, not by
looking — and remember the night-dimming veil composites over both, which is why
`DIM_MAX` is capped where AA still holds at the bottom of the range.

## 12. Paragraphs

Pick **one**: a gap between paragraphs (`--read-para-gap`) **or** a first-line
indent (`--read-indent`). Never both — the tokens enforce this by zeroing the
other mode. Default is the gap, which suits screens; the indent is offered in
settings for readers who want the book convention.

**No drop caps in Thai** unless you have genuinely solved the first tone mark
overlapping the cap. Almost nobody has.

## 13. Reading flow

- Header auto-hides on scroll down, returns on scroll up, leaving a 2px progress bar.
- Reading position is remembered per paragraph and offered back on return.
- Previous/next chapter targets are at least 48px and clearly separated.
- Keyboard: `←` `→` chapters, `+` `−` size, `T` theme, `S` settings, `Esc` back.
- At least 48px of breathing room above and below the body text.
- **Nothing animates or advertises inside the chapter.** Ad breaks belong at the end.
- Honour `prefers-reduced-motion` and `prefers-color-scheme`.

---

## 14. QA string

Use this every time. It exercises all four vertical levels, the characters bad
subsets drop first, and the one run that may legitimately hard-break.

```
ปุ๋ยญี่ปุ่นเกี๊ยะฏิฐิอึ๋ยหนึ่งก็ฤๅๆฯลฯ
"เธอจะไปไหน" เขาถามเสียงเบา ก่อนจะหันไปมองท้องฟ้าที่กำลังเปลี่ยนสี
ผมส่งลิงก์ https://example.com/very/long/path?query=1 ให้เธอดู แล้วบอกว่า OK
```

`/dev/type-spec` renders it across every theme, size, leading, face, measure, and
paragraph mode on one page. Check there before shipping a change to this layer.

### Checklist

- [ ] No tone mark or upper vowel is clipped in any component — badges, buttons, tooltips, toasts included
- [ ] No mid-word Thai break at 320px
- [ ] `text-align: justify` appears nowhere in the CSS
- [ ] Body `letter-spacing` is 0
- [ ] Layout survives 200% browser zoom
- [ ] CLS below 0.05 on throttled 4G (measured with Lighthouse, not assumed)
- [ ] Every theme pair clears 4.5:1
- [ ] Settings persist across reload with no flash of the wrong theme
- [ ] The reading font choice does **not** change the UI font
- [ ] Three paragraphs in dark mode at night do not read as faint
- [ ] Every control in the settings panel is tab-reachable with a visible focus ring
