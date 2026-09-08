# AI Translation Studio

The admin studio translates immutable snapshots of private imported chapters. It does not mutate import staging rows. Approval and publication are separate operations, and only an approved version can be published.

## Production setup

1. Deploy the Drizzle migrations with `npm run db:deploy` before sending traffic to the new application build.
2. Add `AI_TRANSLATION_API_KEY` to the server/Vercel and GitHub `production` environments. `AI_TRANSLATION_BASE_URL` is optional and defaults to `https://api.openai.com/v1`.
3. Create a workspace from an imported source and choose only the target language. The system bootstraps the managed model presets and prompt, builds its initial profile from the imported title and synopsis, snapshots the source, and queues the first 100 chapters automatically.
4. The `Process translation jobs` workflow claims queued items with `FOR UPDATE SKIP LOCKED`. A completed batch automatically creates the next batch until no `READY` or `STALE` chapters remain. A local worker can be run with `npm run db:process-translations -- --limit=10`.

The worker retries an item three times with backoff. It stores provider request identifiers, token counts, latency, and calculated cost, but never logs source text, translated text, prompts, or credentials.

## Permissions

- `EDITOR`: view, configure, enqueue, edit, and approve translations.
- `ADMIN`: all editor permissions plus job cancellation and publication.

Approval creates or updates a catalog chapter with `DRAFT` status and links it to the translation chapter; it is not visible publicly. Publishing does not require a pre-linked public novel or rights metadata, and only the explicit Publish action changes the draft chapter and its novel to `PUBLISHED`.

## Automatic model selection

The application owns the routing presets; admins do not enter model IDs, prices, language pairs, or prompts. Workspace creation upserts GPT-6 Astra, GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna with current routing and cost metadata. Main production translation is pinned to GPT-5.6 Sol. The Admin page displays the complete routing policy as a read-only table.

## Context safety

Each job stores an immutable context snapshot. Context contains only locked terms and characters found in the current source, plus at most two previously approved or published chapters. Chapters with a higher chapter number are excluded by the database query.
