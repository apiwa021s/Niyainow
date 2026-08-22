# Stripe Setup

NovelNow uses Stripe Checkout for reader coin top-ups and monthly writer memberships. Stripe is not enabled unless all required environment variables are configured.

## Required configuration

Set these values directly in the deployment secret manager or local `.env` file:

```dotenv
NEXT_PUBLIC_APP_URL=https://your-production-domain.example
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Do not commit live or test credentials. The Stripe account and payment methods must be approved for NovelNow's actual mature-fiction business category. Do not change or conceal the business description to bypass provider requirements.

## Webhook endpoint

Configure this endpoint in Stripe Dashboard:

```text
POST https://your-production-domain.example/api/webhooks/stripe
```

Subscribe it to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `credit_note.created`

The route reads the raw request body and verifies `Stripe-Signature` before processing. Checkout success redirects never grant coins or membership access.

## Local webhook testing

After signing in to Stripe CLI:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Place the emitted `whsec_...` secret in `.env`, use an `sk_test_...` secret key, and restart the development server.

Run the local signed-event and PostgreSQL verification suite:

```powershell
npm.cmd run db:verify-stripe
```

This verifies duplicate coin fulfillment, subscription-state idempotency, invoice revenue attribution, and partial/full credit-note reversals without making Stripe network calls.

## Operational behavior

- Coin Checkout prices are loaded from `coin_packages`; frontend prices are not trusted.
- Membership Checkout prices are loaded from the active writer plan.
- Checkout requests require an idempotency key.
- Return URLs are restricted to `NEXT_PUBLIC_APP_URL`.
- Stripe test/live event mode must match the configured secret key mode.
- Paid and bonus coins are recorded separately.
- Membership invoice revenue snapshots the creator contract active when Stripe reports payment.
- Credit notes append immutable negative creator revenue and ledger entries.
- Stripe retries are safe because ledger, notification, subscription, invoice, and credit-note effects are idempotent.
