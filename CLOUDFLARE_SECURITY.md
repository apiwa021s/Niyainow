# Cloudflare reader-security runbook

Apply this only when the production hostname is proxied through Cloudflare. The application controls entitlement; Cloudflare is a cost and automation-control layer, not the source of truth.

## Mandatory origin and cache controls

1. Prevent direct-origin bypass. If the origin is not Vercel, allow inbound HTTP only from Cloudflare IP ranges. If it is Vercel, disable public use of the `*.vercel.app` deployment URL with Deployment Protection or an equivalent origin-verification control.
2. Trust `CF-Connecting-IP` only after the origin is locked to Cloudflare. Otherwise a caller can forge this header and rotate application rate-limit identities.
3. Add a Cache Rule with **Bypass cache** for:
   - paths beginning `/api/chapters/`
   - paths beginning `/novel/` and containing `/chapter/`
4. Do not create a Cache Everything rule for reader pages. Personalized paid responses already send `Cache-Control: private, no-store, max-age=0`.

## Rate limiting rules

Create the rules in this order and initially deploy them in Log mode where the plan supports it. Tune against at least seven days of Security Analytics and the application metrics endpoint.

### Chapter HTML

Expression:

```text
not cf.bot_management.verified_bot and
starts_with(http.request.uri.path, "/novel/") and
http.request.uri.path contains "/chapter/" and
http.request.method eq "GET"
```

- Initial threshold: 40 requests per 5 minutes per IP; mitigation timeout 5 minutes.
- Action: Managed Challenge, not Block.
- This edge threshold is intentionally looser than the application session-aware score because multiple readers can share a NAT address.

### Chapter JSON APIs

Expression:

```text
not cf.bot_management.verified_bot and
starts_with(http.request.uri.path, "/api/chapters/") and
http.request.method in {"GET" "POST"}
```

- Initial threshold: 30 requests per 5 minutes per IP; mitigation timeout 5 minutes.
- Action: Block or a rate-limit response. Do not use an interstitial challenge on JSON APIs because HTML challenge responses can break clients.
- Count cached and uncached requests if the current plan exposes that setting.

### Authentication and purchase mutations

Use separate rules for `/api/auth/` and POST requests ending in `/unlock`. Start at 10 requests/minute/IP for auth and 10 requests/minute/IP for unlock. Prefer Managed Challenge for browser auth and Block for the JSON unlock API. Never exempt these routes based only on `User-Agent` or `Referer`.

## Bot Management (when available)

Enterprise Bot Management exposes a 1-99 bot score and a verified-bot flag. Start with Managed Challenge on chapter HTML when:

```text
cf.bot_management.score lt 30 and
not cf.bot_management.verified_bot and
starts_with(http.request.uri.path, "/novel/") and
http.request.uri.path contains "/chapter/"
```

For `/api/chapters/`, a score of 1 plus repeated requests can be blocked. Keep verified search bots excluded so novel detail and permitted free chapters retain SEO visibility. Do not challenge every chapter request, and do not use the score as an entitlement signal.

## AI/content crawlers

In **Security Settings → Configure AI bot policies**, choose the desired Search, Agent, and Training policy. A reasonable starting policy for NovelNow is Search = Allow, Agent = Block, Training = Block. The application `robots.txt` expresses the same preference to named crawlers, but compliance is voluntary; Cloudflare AI bot controls or AI Crawl Control are needed for enforcement.

## Operations

- Review 403/429 volume, challenged-human solve rate, top paths, and application `SCRAPING_SUSPECTED` events weekly during rollout.
- Roll back/tune a rule if normal-reader support reports or challenge solve rates indicate false positives.
- Never permanently ban an IP automatically from application risk alone.
- Keep API challenge exclusions and cache bypass rules covered by a post-deploy smoke test.

References: [Cloudflare rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/), [Bot Management variables](https://developers.cloudflare.com/bots/reference/bot-management-variables/), [AI bot policies](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/), and [managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/).
