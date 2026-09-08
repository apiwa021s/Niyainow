# AI Translation Studio

The admin studio translates immutable snapshots of private imported chapters. It does not mutate import staging rows. Approval and publication are separate operations, and only an approved version can be published.

## Production setup

1. Deploy the Drizzle migrations with `npm run db:deploy` before sending traffic to the new application build.
2. Add `AI_TRANSLATION_API_KEY` to the server/Vercel and GitHub `production` environments. `AI_TRANSLATION_BASE_URL` is optional and defaults to `https://api.openai.com/v1`.
3. Create a workspace from an imported source and choose the target language. The server makes three real structured AI calls: profile analysis, translation foundation, and metadata entity extraction. The UI streams the current stage and model while the calls run. A malformed or failed AI response stops creation; there is no deterministic profile fallback.
4. Review and save the Default Profile, then search, filter, and select up to 100 eligible chapters for the first translation job. Only the selected chapters are queued.
5. The `Process translation jobs` workflow claims queued items with `FOR UPDATE SKIP LOCKED`. `npm run dev` starts both Next.js and a continuous local translation worker, so local queues begin automatically. Use `npm run dev:web` only when intentionally running the web server without a worker. A one-off worker remains available with `npm run db:process-translations -- --limit=10`.

The worker retries an item three times with backoff. It stores provider request identifiers, token counts, latency, and calculated cost, but never logs source text, translated text, prompts, or credentials.

Each chapter exposes truthful worker milestones (`QUEUED`, `CONTEXT`, `CANON_ANALYSIS`, `AI_REQUEST`, `AI_QA`, conditional `ESCALATION`, `CODE_QA`, `SAVING`, and `DONE`) as a progress percentage. Canon analysis, main translation, AI QA, and escalation are separate provider calls and are recorded separately. `CODE_QA` is explicitly labelled as deterministic. Active queues are shown in a collapsible dock on every Admin page, so editors can safely leave the workspace while the worker continues processing.

## Permissions

- `EDITOR`: view, configure, enqueue, edit, and approve translations.
- `ADMIN`: all editor permissions plus job cancellation and publication.

Approval creates or updates a catalog chapter with `DRAFT` status and links it to the translation chapter; it is not visible publicly. Publishing does not require a pre-linked public novel or rights metadata, and only the explicit Publish action changes the draft chapter and its novel to `PUBLISHED`.

## Automatic model selection

The application owns the routing presets; admins do not enter model IDs, prices, language pairs, or prompts. Workspace creation upserts GPT-6 Astra, GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna with current routing and cost metadata. Main production translation is pinned to GPT-5.6 Sol. The Admin page displays the complete routing policy as a read-only table.

## Context safety

Each job stores an immutable context snapshot. Context contains only locked terms and characters found in the current source, plus at most two previously approved or published chapters. Chapters with a higher chapter number are excluded by the database query.
