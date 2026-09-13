# AI Translation Studio

The admin studio translates immutable snapshots of private imported chapters. It does not mutate import staging rows. Approval and publication are separate operations, and only an approved version can be published.

## Production setup

1. Deploy the Drizzle migrations with `npm run db:deploy` before sending traffic to the new application build.
2. Add both `DATABASE_URL` and `AI_TRANSLATION_API_KEY` to the GitHub Environment named `production`; Vercel environment variables are separate and are not copied into GitHub Actions. Also add `AI_TRANSLATION_API_KEY` to Vercel for synchronous profile creation. `AI_TRANSLATION_BASE_URL` is optional and defaults to `https://api.openai.com/v1`. Queued chapter and backfill requests use `AI_TRANSLATION_SERVICE_TIER=flex` by default, preserving the configured models, prompts, structured outputs, and QA pipeline while trading response speed for Batch API token rates. The few profile-creation calls remain on Standard because they run inside a streamed admin request. Set `AI_TRANSLATION_REQUEST_TIMEOUT_MS=900000` for the recommended 15-minute Flex timeout. Set the tier to `default` only when immediate background processing is worth standard API rates.
3. Create a workspace from an imported source and choose the target language. The server makes three real structured AI calls: profile analysis, translation foundation, and metadata entity extraction. The UI streams the current stage and model while the calls run. A malformed or failed AI response stops creation; there is no deterministic profile fallback.
4. Review and save the Default Profile, then search, filter, and select up to 100 eligible chapters for the first translation job. Only the selected chapters are queued.
5. The `Process translation jobs` workflow claims queued items with `FOR UPDATE SKIP LOCKED`. `npm run dev` does not consume translation queues. Use `npm run dev:with-translation-worker` only when intentionally testing the queue worker against the configured database. A one-off worker remains available with `npm run db:process-translations -- --limit=10`.

The worker retries an item three times with backoff, including retryable Flex capacity failures. It stores provider request identifiers, token counts, latency, and calculated cost. Successful Flex calls are costed at 50% of the configured standard model token rates; source text, translated text, prompts, and credentials are never logged.

Each chapter exposes truthful worker milestones (`QUEUED`, `CONTEXT`, `CANON_ANALYSIS`, `AI_REQUEST`, `AI_QA`, conditional `ESCALATION`, `CODE_QA`, `SAVING`, and `DONE`) as a progress percentage. Canon analysis, main translation, AI QA, and escalation are separate provider calls and are recorded separately. `CODE_QA` is explicitly labelled as deterministic. Active queues are shown in a collapsible dock on every Admin page, so editors can safely leave the workspace while the worker continues processing.

## Permissions

- `EDITOR`: view, configure, enqueue, edit, and approve translations.
- `ADMIN`: all editor permissions plus job cancellation and publication.

Approval creates or updates a catalog chapter with `DRAFT` status and links it to the translation chapter; it is not visible publicly. Publishing does not require a pre-linked public novel or rights metadata, and only the explicit Publish action changes the draft chapter and its novel to `PUBLISHED`.

## UX state contract

The studio must always explain the current state, its consequence, and the next safe action:

| Scenario | User-facing behavior |
| --- | --- |
| No approved master rules | Existing work remains available; profile creation is blocked with a direct link to approve rules. |
| No ready import source | The empty state links to Imports and explains that the source must become ready first. |
| Many ready import sources | The Step 1 picker searches title, provider, language, source ID, and workflow copy; reports the full result count; and loads results in chunks instead of silently truncating after 30 rows. |
| Source workflow is unclear | Status filters are recalculated for the selected target language and distinguish not started, profile creation, active AI work, attention required, ready, and unavailable sources. Duplicate titles include a short source ID. |
| Source and target languages match | The source is labelled unavailable, profile creation is blocked, and the UI asks for a different target language before any API call. |
| Source has no chapters | A synopsis-only source remains eligible with an explicit reduced-context note. A source with neither synopsis nor chapters is blocked with the missing requirement. |
| Existing profile has failed | The picker identifies the failed checkpoint, the selected-source card shows the stored error, and the primary action resumes without repeating completed stages. |
| Existing translation has an active job | Step 1 opens the active workspace instead of creating a duplicate. Profile regeneration stays disabled until the active job finishes. |
| First-time user | The landing page explains that profile creation does not translate or publish chapters, and recommends a small trial. |
| Profile creation is running | A non-dismissible progress dialog shows the current stage, selected model, elapsed time, and checkpoint behavior. |
| Profile creation is interrupted | The saved checkpoint is detected and the user can resume without repeating completed stages. |
| Chapter job is queued or running | Progress remains visible globally; the user is explicitly told that it is safe to leave the page. |
| Queue refresh loses connectivity | Last-known progress remains visible with a stale-data warning and a manual retry control. |
| Chapter selection is empty or exceeds 100 | The primary action explains why it is unavailable; selecting item 101 produces an immediate error. |
| Search or status filters return no chapters | A dedicated empty state resets both filters. Quick selection applies only to the currently visible eligible rows. |
| Starting a paid AI job | A confirmation states chapter count, asynchronous behavior, publication safety, and a historical cost estimate when available. |
| Job completes partially | History labels it as partial, shows failed item count and error details, and preserves successful chapters. |
| Translation has critical QA issues | Approval is blocked with an exact issue count and a clear instruction to fix and recheck. |
| Translation has unsaved edits | Navigation asks for confirmation; approve and publish explain that changes must be saved first. |
| Editor role completes review | The UI explains that publication is intentionally handed off to an admin. |
| Workspace or chapter is missing | A route-specific not-found page links back to the studio. |
| Server rendering fails | A route error boundary preserves the admin shell, provides retry, and displays a support digest when available. |

Costs shown in the chapter list, editor, queue dock, and job history are cumulative calculated costs from recorded AI invocations. They are estimates based on stored token usage and configured model prices, not a replacement for the provider invoice.

## Automatic model selection

The application owns the routing presets; admins do not enter model IDs, prices, language pairs, or prompts. Workspace creation upserts GPT-6 Astra, GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna with current routing and cost metadata. All chapter-level generation, escalation, full rewrites, and premium polishing are pinned to GPT-5.6 Sol or cheaper models; GPT-6 Astra is reserved for story-level profile and metadata work. The Admin page displays the complete routing policy as a read-only table.

## Context safety

Each job stores an immutable context snapshot. Context contains only locked terms and characters found in the current source, plus at most two previously approved or published chapters. Chapters with a higher chapter number are excluded by the database query.
