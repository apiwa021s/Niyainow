# AI Translation Studio

The admin studio translates immutable snapshots of private imported chapters. It does not mutate import staging rows. New admin chapter jobs default to automatic approval and publication when translation and its configured polishing finish without critical issues. Approval and publication remain separate internal operations, and only an approved version can be published.

## Production setup

1. Deploy the Drizzle migrations with `npm run db:deploy` before sending traffic to the new application build.
2. Add `DATABASE_URL`, `AI_TRANSLATION_API_KEY`, and `CRON_SECRET` to the Vercel Production environment. Queued work runs entirely on Vercel Workflow, with `/api/cron/translations` providing a five-minute self-healing trigger; GitHub Actions is not part of the translation runtime. `AI_TRANSLATION_BASE_URL` is optional and defaults to `https://api.openai.com/v1`. Queued chapter and backfill requests use `AI_TRANSLATION_SERVICE_TIER=flex` by default, preserving the configured models, prompts, structured outputs, and QA pipeline while trading response speed for Batch API token rates. The few profile-creation calls remain on Standard because they run inside a streamed admin request. Set `AI_TRANSLATION_REQUEST_TIMEOUT_MS=900000` for the recommended 15-minute Flex timeout. Set the tier to `default` only when immediate background processing is worth standard API rates.
3. Create a workspace from an imported source and choose the target language. The server makes five real structured AI calls: profile analysis, translation foundation, profile quality review, metadata localization, and metadata entity extraction. The UI streams the current stage and model while the calls run. A malformed or failed AI response stops creation; there is no deterministic profile fallback.
4. Review and save the Default Profile, then search, filter, and select up to 100 eligible chapters for the first translation job. The chapter action defaults to the economical trial; Standard remains selectable. Admins default to **แปลเสร็จเผยแพร่ทันที** and can disable it to review first. The confirmation describes whether the resulting text will appear publicly, including replacement of an already published chapter after polishing. Only the selected chapters are queued.
5. Vercel Workflow drains queued items with `FOR UPDATE SKIP LOCKED`. Enqueue starts a workflow immediately, while Vercel Cron repairs orphaned queues every five minutes. Cancelling a job atomically cancels both queued and running items; an AI request already sent may still be billed, but its returned translation is discarded. `npm run dev` does not consume translation queues. Use `npm run dev:with-translation-worker` only when intentionally testing the queue worker against the configured database.

Deploy the updated web application and translation worker together, or restart both local processes, before queuing jobs that use automatic publication. Jobs retain the `autoPublish` setting saved when enqueued; legacy jobs without that flag default to manual publication.

After a translation is published, `services/translation-publication-cache.ts` invalidates its Redis chapter cache and sends an authenticated `POST /api/internal/translation-revalidate` to the web application so Next.js refreshes its public caches. Configure `NEXT_PUBLIC_APP_URL` to the reachable web-server URL and use the same `CRON_SECRET` on the web application and worker. Production requires HTTPS. If that request fails, publication remains committed and the existing `chapter_published` outbox event retries cache invalidation without repeating translation or making extra AI calls. The publishing cron processes the outbox; operators can also run `npm run db:process-outbox`, which uses `node --conditions=react-server --import tsx db/process-outbox.ts` for the server-only runtime.

The worker retries an item three times with backoff, including retryable Flex capacity failures. It stores provider request identifiers, token counts, latency, and calculated cost. Successful Flex calls are costed at 50% of the configured standard model token rates; source text, translated text, prompts, and credentials are never logged.

Each chapter exposes truthful worker milestones (`QUEUED`, `CONTEXT`, `AI_REQUEST`, `AI_QA`, conditional `ESCALATION`, `CODE_QA`, `SAVING`, and `DONE`) as a progress percentage. The first chapter call combines the complete translation and compact canon analysis. Standard uses separate AI QA and conditional correction calls. The economical trial combines polishing and a final QA verdict in one call; its progress label explains that combined step. `CODE_QA` is explicitly labelled as deterministic. Active queues are shown in a collapsible dock on every Admin page, so editors can safely leave the workspace while the worker continues processing.

## Permissions

- `EDITOR`: view, configure, enqueue, edit, and approve translations.
- `ADMIN`: all editor permissions plus job cancellation and publication, including automatic publication for queued chapter jobs.

Approval creates or updates a catalog chapter with `DRAFT` status and links it to the translation chapter; that stage is not visible publicly. Publishing does not require a pre-linked public novel or rights metadata. Either the explicit Publish action or an admin job's saved automatic-publication setting changes the draft chapter and its novel to `PUBLISHED`. Editors must enqueue with automatic publication disabled, and the server rejects requests to enable it without publication permission.

Automatic publication skips human review and does not use the final score or non-critical warnings as publication gates. Critical QA issues and an outdated source still stop approval/publication. Findings and scores remain available in the editor and history. The `autoPublish` flag is saved in each item's immutable job metadata when queued; changing the selector affects only new jobs. Legacy jobs without that flag retain their previous manual-publication behavior.

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
| Starting a paid AI job | A confirmation states chapter count, asynchronous behavior, whether completed text will be published automatically, and a historical cost estimate when available. |
| Starting an economical trial | The mode selector and confirmation identify Luna and one polishing round. Automatic publication defaults on for admins; it can be disabled for manual review. Prior revisions remain available for comparison in either case. |
| Job completes partially | History labels it as partial, shows failed item count and error details, and preserves successful chapters. |
| Translation has critical QA issues | Approval is blocked with an exact issue count and a clear instruction to fix and recheck. |
| Translation has unsaved edits | Navigation asks for confirmation; approve and publish explain that changes must be saved first. |
| Editor role completes review | The UI explains that publication is intentionally handed off to an admin. |
| Workspace or chapter is missing | A route-specific not-found page links back to the studio. |
| Server rendering fails | A route error boundary preserves the admin shell, provides retry, and displays a support digest when available. |

Costs shown in the chapter list, editor, queue dock, and job history are cumulative calculated costs from recorded AI invocations. They are estimates based on stored token usage and configured model prices, not a replacement for the provider invoice.

## Economical trial and quality comparison

New chapter jobs offer `ECONOMY` (the default in the admin selector) and `STANDARD`. The job's execution mode is saved with its checkpoint so changing the selector cannot alter work already queued. Jobs created before mode selection retain Standard behavior.

The economical trial uses GPT-6 Luna for all chapter AI work. Its final verdict is the polishing model's self-assessment, not an independent review by a second model:

- `TRANSLATE`: one complete translation with compact canon analysis, followed by exactly one polishing call that returns the complete revised translation and self-review findings for that final text. A successful uninterrupted run makes two paid calls.
- `POLISH`: one call compares the existing translation with the source, polishes it, and returns final self-review findings. A successful uninterrupted run makes one paid call.
- Deterministic glossary and structural checks still run on the final text. Remaining findings are saved for the editor; the trial does not invoke additional paid correction loops, full rewrites, or an expensive model fallback. Failed provider calls may still require worker retries.

The complete immutable source, profile, localization rules, glossary, and relevant character context remain available to the model. Successful intermediate responses are checkpointed for retries. Story-level profile creation keeps its existing models and separate cost accounting.

Every trial creates a new AI revision. For admin jobs with automatic publication enabled, a revision without critical issues is approved and published immediately after the single polishing round; low scores and warnings remain recorded. With automatic publication disabled, it remains available for manual review. Prior revisions, including an already approved manual revision, are retained for quality comparison. In the chapter editor, choose **เทียบฉบับก่อนหน้า** or a revision's comparison button in the history panel. The comparison opens the selected prior revision beside the latest saved version, stacked on mobile; it loads that prior text through an authenticated read-only endpoint and preserves any unsaved editor changes. Compare meaning, omissions, names, dialogue, and natural Thai phrasing before or after publication. A lower model and one editorial round can change quality; the same quality has not been established until those outputs are compared.

GPT-6 Luna's configured Standard rates are $0.10 per million input tokens and $0.50 per million output tokens; confirmed Flex responses use half those rates. Actual chapter spending still depends on input, output, reasoning, cache usage, and retries. The latest completed job and job history show its saved mode and calculated spending, allowing cost and quality to be evaluated together. Historic cumulative averages include older Standard spending and do not immediately fall to the trial's cost level. See [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) and [API pricing](https://developers.openai.com/api/docs/pricing).

## Average chapter cost target

The workspace targets an **average of 1 THB per chapter**. This is a reporting target, not a per-chapter spending cap. Standard preserves its models, prompts, default QA score of 90, and structural repair policy. The economical trial reduces the model price and limits polishing to one round. Automatic publication adds no AI calls, correction rounds, or model upgrades. Measure completed jobs before treating the average target as achieved.

Set `AI_TRANSLATION_THB_PER_USD` to the planning conversion rate that matches your billing/payment rate. The server validates a finite positive number and otherwise uses 35 THB/USD. The workspace explicitly labels this as a planning rate, not a live foreign-exchange quote. The original USD token costs remain unchanged.

The cumulative average includes chapter spending on failed attempts, retries, translations, and polishing, divided by the number of chapters with a saved AI translation. Failed attempts and manual-only chapters do not increase that denominator, and repeated translation of a chapter counts as spending on the same chapter. The latest completed job also shows average spending per successful item, so editors can compare a new run with older cumulative spending. Story-level profile setup is excluded from this chapter average; its separate invocation costs remain available in the workspace. Selection estimates use historical cumulative spending and do not predict the exact cost of the selected chapters.

Shared cost reductions and Standard review behavior:

- Shared profile and language rules appear once in each review request.
- An additional explicit cache breakpoint reuses the immutable source and review context during repeated QA requests, while the changing draft remains after that breakpoint. Patch editors and full rewrites keep the entire source available but do not create this extra chapter cache write for potentially single-use input. The shared profile breakpoint is preserved across multi-chapter jobs and review/editor calls. A single-chapter job disables the shared breakpoint for its one main translation/polish call to avoid paying a cache-write premium with no subsequent main call in that job; separate single-chapter jobs consequently do not reuse that main prefix. Compatible third-party endpoints still receive the complete payload without OpenAI-specific caching options.
- A successful QA verdict is checkpointed and reused on a worker retry only when the source, translation, review context, model configuration, quality threshold, and QA policy still match. Changed text still requires a new AI review. Completed correction rounds also survive retries.

Standard QA uses at most two corrective passes after the first review. Each pass applies validated local suggestions from the current review, requests an editor patch only when actionable findings remain, and reviews the final changed draft once. Local-only verification consumes a pass too, bounding an uninterrupted chapter to three QA calls and two paid editor passes. This avoids reviewing between local and paid edits that address the same findings. Remaining critical findings block approval/publication. Low-score findings remain recorded and require manual approval when automatic publication is disabled; enabling automatic publication allows a non-critical revision to publish after the configured correction budget. The correction score threshold is not reduced and the final verdict is never reused for unchecked changed text.

A Standard single-chapter run recorded on 2026-10-08 cost $0.335334 (about 11.74 THB at the default planning rate), including one main translation, four QA calls, and two patch calls. The preceding 20-chapter job in the same workspace averaged about 7.82 THB per chapter. That AI version still scored 86; the subsequently approved manual version applied all five remaining QA suggestions. This motivated the bounded correction flow and narrower cache writes above. These changes are verified with mocked provider/worker regressions; these recorded runs preceded the correction and do not measure its new API cost or literary quality.

Cache savings depend on reported cache hits and actual provider billing. Full translated output is still billed: at the configured Sol Flex output rate of $10 per million tokens and the default planning rate of 35 THB/USD, 2,857 output tokens already cost about 1 THB before input, canon, reasoning, or QA. Consequently, unchanged-model translation cannot guarantee the 1 THB average for a corpus of long chapters. Verify the target against newly completed jobs after applying these changes; do not treat historical estimates or cache configuration as proof that the target has been reached.

Official references: [API pricing](https://developers.openai.com/api/docs/pricing), [Flex processing](https://developers.openai.com/api/docs/guides/flex-processing), and [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).

## Automatic model selection

The application owns the routing presets; admins select a chapter execution mode rather than entering model IDs, prices, language pairs, or prompts. Automatic configuration upserts GPT-6 Astra, GPT-6 Luna, GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna with current routing and cost metadata. Economical chapter work uses GPT-6 Luna. Standard chapter generation, corrections, full rewrites, and premium polishing use GPT-5.6 Sol or cheaper models; GPT-6 Astra is reserved for story-level profile and metadata work. The Admin page identifies economical routing separately from its read-only table of Standard and story-level routes.

## Context safety

Each job stores an immutable context snapshot. Context contains only locked terms and characters found in the current source, plus at most two previously approved or published chapters. Chapters with a higher chapter number are excluded by the database query.
