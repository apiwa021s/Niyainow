import { Fragment } from "react";

/** A paragraph that is only a scene divider in disguise. */
const SCENE_BREAK = /^[\s*·•—–_.]{2,}$|^[✦✧❈❖]+$/;

/**
 * Runs long enough to overflow a 320px column if the browser cannot break them.
 * Split-capture needs the global flag; the membership test uses a separate,
 * stateless pattern because a /g regex carries lastIndex between .test calls.
 */
const URL_SPLIT = /(https?:\/\/\S+|www\.\S+)/g;
const IS_URL = /^(https?:\/\/|www\.)/;

/**
 * Wraps bare URLs so the one place a hard break is correct can opt into it.
 * Everything around them keeps `word-break: normal`, which is what lets the
 * browser's Thai dictionary find real word boundaries.
 */
function renderParagraph(text: string) {
  const parts = text.split(URL_SPLIT);
  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    IS_URL.test(part)
      ? (
        // lang="en" too: a Latin run inside Thai copy should not be measured
        // against Thai line-breaking rules.
        <span key={index} data-read-url lang="en">
          {part}
        </span>
      )
      : <Fragment key={index}>{part}</Fragment>,
  );
}

/**
 * The chapter text itself.
 *
 * All typography comes from `.read-body` in globals.css, which resolves the
 * `--read-*` tokens. Nothing here sets a size, a leading, or a colour — that is
 * the whole point of the token layer.
 */
export function ChapterBody({ paragraphs, teaser = false }: { paragraphs: string[]; teaser?: boolean }) {
  return (
    <div className="read-body" lang="th">
      {paragraphs.map((paragraph, index) => {
        const trimmed = paragraph.trim();

        if (SCENE_BREAK.test(trimmed)) {
          return <hr key={`break-${index}`} className="read-break" data-reader-paragraph={index} aria-hidden />;
        }

        return (
          <p
            key={`${index}-${trimmed.slice(0, 24)}`}
            data-reader-paragraph={index}
            className={teaser && index === paragraphs.length - 1 ? "opacity-40" : undefined}
          >
            {renderParagraph(paragraph)}
          </p>
        );
      })}
    </div>
  );
}
