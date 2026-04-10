# KIE API Commercialization Design

**Date:** 2026-04-09
**Branch:** `feature/kie-api-commercialization`
**Scope:** Phases 1–4 — backend foundation, payments, desktop app auth/credits, model/mode selection

---

## Overview

Transform the app from a direct Gemini API desktop tool into a commercial product. Users purchase credits to generate images. The app routes all generation requests through a backend that enforces credit balances and proxies to the KIE API. Both real-time and batch processing modes are supported.

---

## Architecture

```
┌─────────────────────────────────┐
│   Desktop App (Tauri/SvelteKit) │
│   - Auth screen                 │
│   - Credit balance display      │
│   - Model + mode selector       │
│   - Cost preview                │
│   - Job status / results        │
└──────────────┬──────────────────┘
               │ HTTPS (auth token)
┌──────────────▼──────────────────┐
│   Hono API (TypeScript)         │
│   - KIE proxy (real-time+batch) │
│   - Credit deduction            │
│   - Stripe webhook handler      │
│   - Batch job queue             │
└──────┬────────────────┬─────────┘
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│  PocketBase │  │   KIE API   │
│  - auth     │  │  - real-time│
│  - credit   │  │  - batch    │
│    ledger   │  └─────────────┘
│  - jobs DB  │
│  - admin UI │
└──────┬──────┘
       │
┌──────▼──────┐
│   Stripe    │
│  - checkout │
│  - webhooks │
└─────────────┘
```

The desktop app never communicates with KIE or Stripe directly. All traffic flows through the Hono API, which owns the KIE key and enforces credit balances server-side.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop app | Tauri + SvelteKit (existing) |
| API sidecar | TypeScript + Hono |
| Auth + DB + Admin | PocketBase (vanilla binary) |
| Payments | Stripe (Checkout + webhooks) |
| AI generation | KIE API (real-time + batch) |
| Deployment | Single VPS (Hetzner/DigitalOcean, ~$6-10/mo) |

PocketBase and the Hono API run as two processes on the same VPS, managed by PM2 or systemd. PocketBase handles auth and data; Hono handles all business logic.

---

## Database Schema (PocketBase Collections)

### `users`
Handled by PocketBase auth — no custom schema needed. Provides JWT-based auth out of the box.

### `credit_ledger`
Immutable transaction log. Balance is always derived by summing entries — no mutable balance field.

| Field | Type | Notes |
|-------|------|-------|
| `user_id` | Relation → users | |
| `amount` | Int | Positive = credit, negative = debit |
| `balance_after` | Int | Snapshot for fast balance reads |
| `type` | Enum | `purchase` \| `generation` \| `refund` |
| `reference_id` | String | Job ID or Stripe session ID |

### `jobs`
| Field | Type | Notes |
|-------|------|-------|
| `user_id` | Relation → users | |
| `status` | Enum | `pending` \| `processing` \| `complete` \| `failed` |
| `mode` | Enum | `realtime` \| `batch` |
| `model` | String | `nano-banana-pro` \| `4o-image` \| `flux-kontext` |
| `credits_cost` | Int | Total credits charged |
| `kie_job_id` | String | KIE's internal job reference |

### `job_items`
Individual images within a job (one job can contain multiple images).

| Field | Type | Notes |
|-------|------|-------|
| `job_id` | Relation → jobs | |
| `status` | Enum | `pending` \| `processing` \| `complete` \| `failed` |
| `prompt` | Text | |
| `resolution` | String | e.g. `1K`, `2K`, `4K` |
| `output_url` | URL | Populated on completion |
| `error` | Text | Populated on failure |

### `payments`
| Field | Type | Notes |
|-------|------|-------|
| `user_id` | Relation → users | |
| `stripe_session_id` | String | For deduplication |
| `credits_purchased` | Int | |
| `amount_paid_cents` | Int | In cents |
| `status` | Enum | `pending` \| `complete` \| `refunded` |

---

## Credit System

### Pricing (Draft)

| Pack | Credits | Price |
|------|---------|-------|
| Starter | 100 | $4.99 |
| Standard | 500 | $19.99 |
| Pro | 1,200 | $39.99 |

### Credit Cost Per Generation

| Model | Resolution | Mode | Credits |
|-------|-----------|------|---------|
| Nano Banana Pro | 1K | Real-time | 1 |
| Nano Banana Pro | 2K | Real-time | 2 |
| Nano Banana Pro | 4K | Real-time | 3 |
| Nano Banana Pro | any | Batch | 20% discount |
| 4o Image | TBD | Real-time | TBD |
| Flux.1 Kontext | TBD | Real-time | TBD |

*Exact costs for 4o Image and Flux.1 Kontext need to be validated against KIE API pricing.*

### Deduction Flow

Every generation request follows this sequence atomically:

1. Validate auth token with PocketBase
2. Calculate credit cost (model + resolution + mode)
3. Read user's current balance from `credit_ledger` (sum or `balance_after` of latest entry)
4. If balance < cost → reject with `402 Insufficient Credits`
5. Write debit entry to `credit_ledger`
6. Forward request to KIE API
7. On success → create `job` + `job_items` records in PocketBase
8. Return job ID to client

Step 5 (debit write) is atomic in PocketBase. If the KIE API call (step 6) fails, Hono writes a refund entry to `credit_ledger` to restore the balance — no manual intervention needed. Jobs are only created (step 7) on KIE success.

---

## Generation Modes

### Real-time
- KIE responds synchronously (or near-synchronously)
- App polls `GET /api/jobs/:id` until status = `complete`
- Results typically available within seconds

### Batch
- KIE queues the request
- Hono stores the job and polls KIE in the background at intervals
- App subscribes to PocketBase SSE for live job status updates (no polling hammering)
- Lower credit cost (20% discount) — surfaced to users in the UI

---

## Stripe Payment Flow

1. User selects a credit pack in the app and clicks "Buy Credits"
2. App calls `POST /api/credits/purchase` with pack ID
3. Hono creates a Stripe Checkout session and returns the URL
4. App opens the URL in the system browser
5. User completes payment on Stripe-hosted page
6. Stripe fires `checkout.session.completed` webhook to `POST /api/webhooks/stripe`
7. Hono verifies Stripe signature, looks up user, writes credit purchase to `credit_ledger`, writes to `payments`
8. App sees updated balance on next poll or app resume

Stripe session IDs are stored in `payments` to prevent duplicate crediting on webhook retries.

---

## Hono API Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/generate` | Submit real-time generation job |
| `POST` | `/api/generate/batch` | Submit batch generation job |
| `GET` | `/api/jobs/:id` | Poll job status |
| `GET` | `/api/credits/balance` | Get current credit balance |
| `POST` | `/api/credits/purchase` | Create Stripe Checkout session |
| `POST` | `/api/webhooks/stripe` | Handle Stripe payment events |

All routes except `/api/webhooks/stripe` require a valid PocketBase JWT in the `Authorization` header.

---

## Desktop App Changes

### New Screens / Components

**Login/Signup screen**
- Shown on launch when no auth token is stored
- Email + password via PocketBase auth API
- Token stored in Tauri's secure storage (keychain)
- Token refresh on app launch and before expiry

**Credit balance display**
- Live credit count in the app header
- Updates after each generation
- Low-balance warning at < 10 credits
- "Buy Credits" button → triggers purchase flow

**Processing mode toggle**
- Real-time vs Batch selector in the generation form
- Batch shows estimated wait time and discounted credit cost

**Model picker**
- Nano Banana Pro (default) / 4o Image / Flux.1 Kontext
- Shows credit cost per model + resolution inline

**Cost preview**
- "This will use X credits" before the user submits
- Updates dynamically as model, resolution, and mode are changed

### Refactors

- Replace all direct Gemini API calls with `POST /api/generate` or `/api/generate/batch`
- Remove local API key storage from `src/lib/stores/config.ts`
- Add auth token management to config store
- Update `src/lib/stores/jobs.ts` to match new job schema from backend
- Update job polling to use new `GET /api/jobs/:id` endpoint
- Upload source images to backend for I2I (Hono stores temporarily, passes to KIE)

### Keep As-Is
- Local SQLite (Tauri) for job history cache
- Theme system
- File handling UI

---

## Deployment

Both services run on a single VPS:

```
VPS (~$6-10/mo)
├── PocketBase binary  (port 8090, internal)
├── Hono API           (port 3000, internal)
└── Caddy              (reverse proxy, handles TLS)
    ├── api.yourdomain.com → Hono API
    └── pb.yourdomain.com  → PocketBase admin (restricted)
```

Caddy auto-provisions TLS via Let's Encrypt. PocketBase admin should be IP-restricted or behind basic auth.

---

## Open Questions

1. **Exact KIE credit costs** for 4o Image and Flux.1 Kontext — need to verify before setting user-facing pricing
2. **Batch polling interval** — how frequently does Hono poll KIE for batch job completion?
3. **Refund policy** — what happens when a KIE job fails after credits are deducted? Auto-refund or manual?
4. **BYOK option** — allow "bring your own KIE key" as a free tier? (deferred, not in this phase)
5. **New brand name** — required before any public launch (tracked separately)
6. **Domain** — needed for backend API and Caddy TLS setup
