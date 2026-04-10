# Commercialization Plan

## Overview

Transform the current Nanobanana Studio desktop app into a commercial product for content creators. Monetize via a credit-based system where users purchase credits to process images and videos, with the app proxying requests through a backend API to [Kie.ai](https://kie.ai) for cost-effective AI generation.

---

## 1. API Provider: Kie.ai

### What It Is
Kie.ai is an API aggregator providing access to multiple AI models at 30-50% below direct API pricing. Credit-based: 1 credit ~ $0.005 USD.

### Available Models (Relevant)

| Category | Models | Notes |
|----------|--------|-------|
| Image Generation | 4o Image, Flux.1 Kontext, Nano Banana Pro (Gemini 3.0 Pro) | Core offering |
| Video Generation | Veo 3.1, Veo 3.1 Fast, Runway Aleph | Future expansion |
| Music Generation | Suno V3.5 / V4 / V4.5 / V4.5 Plus | Future expansion |

### Kie.ai Image Pricing (Our Cost)

| Model | Resolution | Cost per Image |
|-------|-----------|----------------|
| Nano Banana Pro | 1K-2K | $0.09 |
| Nano Banana Pro | 4K | $0.12 |

### Processing Modes

- **Real-time API**: Instant results, higher cost per request
- **Bulk API**: Queued/batch processing, lower cost — pass savings to users

---

## 2. Revenue Model: Credits

### How It Works
1. Users purchase credit packs or subscribe for monthly allotments
2. Each generation action costs a defined number of credits
3. Backend deducts credits before proxying requests to Kie.ai
4. Margin = user credit price - Kie.ai cost

### Pricing Tiers (Draft)

| Tier | Model | Target User | Benefit |
|------|-------|-------------|---------|
| Real-time | Per-credit, instant processing | Creators who need results now | Speed |
| Bulk | Discounted credits, queued | Batch workflows | Cost savings |
| Subscription | Monthly credit allotment | Regular users | Predictable spend, recurring revenue |

### Credit Pricing (TBD)
- Need to determine markup over Kie.ai costs
- Consider volume discounts for larger packs
- Subscription tiers could include a base credit allotment + discounted top-ups

---

## 3. Architecture

### Current Architecture (Direct API)
```
Desktop App (Tauri) --> Gemini API (direct, user's own key)
```

### Target Architecture (Commercial)
```
┌─────────────────────────────┐
│   Desktop App (Tauri)       │
│   - Auth (login/signup)     │
│   - Credit balance display  │
│   - Real-time generation    │
│   - Bulk job submission     │
└──────────┬──────────────────┘
           │ HTTPS
┌──────────▼──────────────────┐
│   Backend API               │
│   - Auth / session mgmt     │
│   - Credit ledger           │
│   - Rate limiting           │
│   - Job queue (bulk)        │
│   - Payment webhooks        │
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│   Kie.ai API                │
│   - Image generation        │
│   - Video generation        │
│   - Bulk API                │
└─────────────────────────────┘
```

### Why a Backend Is Required
- **API key security**: Can't embed Kie.ai keys in the desktop app — users could extract them
- **Credit enforcement**: Must validate credit balance server-side before proxying requests
- **Usage tracking**: Centralized logging for billing, analytics, abuse prevention
- **Rate limiting**: Protect against runaway usage

---

## 4. Payment Processing

### Option A: Stripe (Recommended for Flexibility)

**Pros:**
- First-class [credit-based pricing](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model) support
- [Billing credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits) with built-in metering
- [Pay-as-you-go](https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide?dashboard-or-api=api) model available
- Mature API, extensive documentation
- Stripe Checkout for hosted payment pages (no custom payment UI needed)

**Cons:**
- Must handle tax compliance (Stripe Tax available as add-on)
- More integration work

**How it works:**
1. User clicks "Buy Credits" in the app
2. App opens Stripe Checkout (browser) or embedded payment flow
3. Stripe webhook hits backend on successful payment
4. Backend credits user's account

### Option B: Paddle (Easier Compliance)

**Pros:**
- Merchant of Record — Paddle handles global tax, invoicing, compliance
- Good fit for desktop apps and small teams
- Less operational overhead

**Cons:**
- Less flexible than Stripe
- Higher per-transaction fees
- Less control over the billing experience

### Decision Needed
- Stripe gives more control and lower fees at scale
- Paddle removes tax/compliance burden entirely
- Could start with Paddle for speed, migrate to Stripe later if needed

---

## 5. Backend API Requirements

### Core Services

| Service | Purpose |
|---------|---------|
| Auth | User registration, login, session management |
| Credit Ledger | Balance tracking, deductions, purchase history |
| Generation Proxy | Validate credits, proxy to Kie.ai, track usage |
| Job Queue | Manage bulk/async jobs, status polling |
| Payment Webhooks | Handle Stripe/Paddle payment events |

### Tech Stack Options

| Approach | Stack | Tradeoffs |
|----------|-------|-----------|
| Self-hosted | Rust/Node/Go + PostgreSQL + Redis | Full control, more ops work |
| BaaS + Functions | Supabase (auth + DB) + Edge Functions | Faster to ship, less control |
| Serverless | AWS Lambda / Cloudflare Workers + DB | Scales automatically, cold starts |

### Decision Needed
- Build vs BaaS depends on team capacity and timeline
- Supabase could handle auth + DB + edge functions with minimal setup
- A lean Rust or Node service is also viable if self-hosting is preferred

---

## 6. Desktop App Changes Required

### New Features
- **User auth flow**: Login / signup / password reset
- **Credit balance display**: Show remaining credits in header
- **Purchase flow**: Open payment page (Stripe Checkout or Paddle overlay)
- **Processing mode selector**: Real-time vs Bulk
- **Usage history**: Past generations with credit costs

### Refactoring
- Replace direct Gemini API calls with backend API calls
- Remove local API key storage (no longer needed — backend owns the keys)
- Add auth token storage and refresh logic
- Update job polling to work with backend job queue

### Keep
- Local SQLite for offline caching / job history
- Theme system
- File handling for I2I (upload to backend instead of direct to Gemini)

---

## 7. Rebrand

### Why
- "Nano Banana" is already used by Kie.ai for their Gemini image generation API ("Nano Banana Pro")
- Need a distinct brand to avoid confusion and potential trademark issues

### Requirements
- New app name and identity
- New bundle ID (currently `com.nanobanana.studio`)
- New domain for the backend API and marketing site
- Updated in-app branding (logo, title, theme colors)

### Timeline
- Rebrand can happen in parallel with backend development
- Should be finalized before any public launch or payment processing setup

---

## 8. Future Expansion

### Video Generation
- Kie.ai offers Veo 3.1 and Runway Aleph APIs
- Higher credit cost per generation
- Different UI needed (video preview, longer processing times)

### Content Creator Features
- Template library (pre-built prompts for common use cases)
- Batch workflows (CSV import of prompts)
- Brand kits (consistent style settings)
- Team/organization accounts

### Distribution
- Direct download from website
- Potential app store distribution (Mac App Store, Microsoft Store)
- Consider web version for broader reach

---

## 9. Implementation Phases

> See also: [Backend Architecture](./backend-architecture.md) for detailed backend options, database schema, and API endpoints.

### Phase 1: Backend Foundation

**Goal**: Get a working backend with auth, credits, and Kie.ai proxy.

1. **Set up PocketBase instance**
   - Deploy PocketBase to a VPS (Hetzner or DigitalOcean, ~$5-10/mo)
   - Configure domain + TLS (e.g., `api.yourbrand.com`)
   - Set up automated backups for the SQLite database

2. **Create database collections**
   - `users` — handled by PocketBase auth
   - `credit_balances` — user_id, balance (integer)
   - `credit_transactions` — immutable ledger (type, amount, balance_after, reference_id)
   - `jobs` — generation jobs (status, mode, model, credits_cost, kie_job_id)
   - `job_items` — individual items within jobs (status, input, output, error)
   - `payments` — synced from payment provider webhooks

3. **Implement Kie.ai proxy route**
   - Custom PocketBase route: `POST /api/generate`
   - Authenticate request (JWT from PocketBase auth)
   - Check user's credit balance >= required credits
   - Deduct credits atomically (balance check + deduction in one transaction)
   - Forward request to Kie.ai API
   - Store job + job_items in database
   - Return job ID to client
   - On Kie.ai completion: store results, update job status

4. **Implement bulk/queue route**
   - Custom route: `POST /api/generate/bulk`
   - Same auth + credit check flow
   - Submit batch to Kie.ai bulk API
   - Background polling for batch completion
   - Update job status + items as results come in

5. **Set up admin access**
   - PocketBase admin dashboard available at `/admin`
   - Create admin account
   - Verify ability to view users, balances, transactions, jobs

**Deliverable**: Backend that can authenticate users, manage credits, and proxy image generation requests to Kie.ai.

---

### Phase 2: Payment Integration

**Goal**: Users can purchase credits with real money.

1. **Set up Stripe account** (or Paddle — see Section 4)
   - Create Stripe account, complete verification
   - Define products: credit packs (e.g., 100 credits, 500 credits, 1000 credits)
   - Configure Stripe Checkout sessions for each pack
   - If using subscriptions: define plans with monthly credit allotments

2. **Implement purchase flow**
   - Custom PocketBase route: `POST /api/credits/purchase`
   - Accepts pack selection, creates Stripe Checkout session
   - Returns checkout URL to the desktop app
   - App opens URL in system browser

3. **Implement webhook handler**
   - Custom route: `POST /api/webhooks/stripe`
   - Verify Stripe signature
   - On `checkout.session.completed`: grant credits to user
   - On `charge.refunded`: deduct credits, log refund
   - On subscription renewal: grant monthly credits

4. **Credit pack pricing (draft)**

   | Pack | Credits | Price | Per-Credit | Margin Target |
   |------|---------|-------|------------|---------------|
   | Starter | 100 | $4.99 | $0.050 | ~44% on 1K images |
   | Standard | 500 | $19.99 | $0.040 | ~56% on 1K images |
   | Pro | 1,200 | $39.99 | $0.033 | ~63% on 1K images |

   *Note: 1 credit = 1 standard (1K) image generation. 2K costs 2 credits, 4K costs 3 credits. Pricing needs validation against Kie.ai actual costs.*

5. **Subscription tiers (draft)**

   | Plan | Monthly Price | Credits/Month | Bonus | Top-Up Rate |
   |------|--------------|---------------|-------|-------------|
   | Hobby | $9.99 | 250 | — | $0.040/credit |
   | Creator | $24.99 | 750 | Priority queue | $0.035/credit |
   | Studio | $49.99 | 2,000 | Priority + bulk discount | $0.030/credit |

6. **Admin: payment monitoring**
   - View payments in PocketBase admin
   - Verify webhook processing
   - Manual credit adjustment for support issues

**Deliverable**: Users can buy credits via Stripe Checkout, credits are automatically granted, subscriptions auto-renew.

---

### Phase 3: Desktop App — Auth & Credits

**Goal**: The Tauri app authenticates users and displays credit balance.

1. **Auth flow in the app**
   - New login/signup screen (shown when no auth token is stored)
   - Email + password registration via PocketBase auth API
   - Store auth token securely (Tauri secure storage or keychain)
   - Token refresh on app launch and before expiry
   - Logout functionality

2. **Credit balance UI**
   - Display credit balance in the header (where stats currently are)
   - Real-time balance updates after each generation
   - Low-balance warning (e.g., < 10 credits)
   - "Buy Credits" button that opens Stripe Checkout in browser

3. **Replace Gemini direct calls with backend API**
   - Refactor `src-tauri/src/commands/jobs.rs`:
     - Remove direct Gemini API integration
     - Replace with HTTPS calls to backend API
     - Send auth token with every request
   - Refactor `src-tauri/src/commands/config.rs`:
     - Remove API key storage
     - Replace with auth token management
   - Update frontend stores:
     - `src/lib/stores/jobs.ts` — update to match new backend response format
     - `src/lib/stores/config.ts` — replace API key state with auth state + credits

4. **Job status polling**
   - For real-time jobs: poll `GET /api/jobs/:id` until completed
   - For bulk jobs: poll at longer intervals (every 5-10s)
   - Or use PocketBase real-time subscriptions (SSE) for push updates

5. **Image-to-Image upload flow**
   - Upload source images to backend (not direct to Gemini)
   - Backend stores temporarily, includes in Kie.ai request
   - Clean up after job completion

6. **Error handling**
   - Insufficient credits → show balance, prompt to purchase
   - Auth expired → redirect to login
   - Backend unreachable → show offline state, retry logic
   - Job failed → show error, offer refund request

**Deliverable**: Desktop app with login, credit display, and all generation routed through the backend.

---

### Phase 4: Processing Modes & Model Selection

**Goal**: Expose real-time vs bulk processing, and multiple AI models.

1. **Processing mode selector**
   - Add toggle/selector in the generation form: Real-time | Bulk
   - Real-time: immediate processing, standard credit cost
   - Bulk: queued processing, discounted credit cost (e.g., 20% less)
   - Show estimated wait time for bulk jobs

2. **Model selection**
   - Add model picker to the generation form
   - Available models from Kie.ai (image):
     - Nano Banana Pro (Gemini 3.0 Pro) — default
     - 4o Image (GPT-4o image gen)
     - Flux.1 Kontext
   - Show credit cost per model + resolution
   - Backend validates model selection and applies correct pricing

3. **Credit cost display**
   - Show cost before submitting: "This will use X credits"
   - Cost breakdown: model + resolution + processing mode
   - Running total for batch jobs (N images x X credits each)

4. **Backend: model routing**
   - Map model selection to correct Kie.ai API endpoint
   - Apply per-model credit pricing
   - Validate model + resolution combinations

**Deliverable**: Users can choose between models and processing modes with transparent pricing.

---

### Phase 5: Rebrand & Launch Prep

**Goal**: New identity, ready for public launch.

1. **Brand identity**
   - Finalize new app name
   - Design logo and icon
   - Define color palette and typography
   - Register domain for marketing site + API

2. **App rebrand**
   - Update `tauri.conf.json`: window title, bundle identifier
   - Update `package.json`: name, version bump
   - Replace all "Nanobanana" / "nanobanana" references in code
   - New app icon (all platform sizes)
   - Update theme colors in `app.css`

3. **Marketing site**
   - Landing page with product description, screenshots, pricing
   - Download links (macOS, Windows, Linux)
   - Link to Stripe Checkout / pricing page
   - Terms of service, privacy policy

4. **Legal**
   - Terms of service (credit purchases, refund policy, acceptable use)
   - Privacy policy (what data is collected, how it's stored)
   - GDPR considerations if targeting EU users

5. **Build & distribution**
   - Tauri build for macOS (.dmg), Windows (.msi/.exe), Linux (.AppImage/.deb)
   - Code signing (Apple Developer ID, Windows code signing cert)
   - Auto-update mechanism (Tauri updater plugin)

6. **Beta testing**
   - Invite limited users with free credits
   - Monitor for bugs, payment flow issues, credit accounting errors
   - Gather feedback on pricing and UX

**Deliverable**: Rebranded app with builds for all platforms, marketing site live, ready for paid users.

---

### Phase 6: Post-Launch & Expansion

**Goal**: Iterate based on usage, expand feature set.

1. **Analytics & monitoring**
   - Track: generations/day, revenue, costs, margins, error rates
   - Alert on: failed jobs, low Kie.ai balance, payment failures
   - User analytics: retention, credit usage patterns

2. **Video generation**
   - Add Veo 3.1 / Runway Aleph support via Kie.ai
   - New UI for video preview + longer processing times
   - Higher credit costs for video

3. **Content creator features**
   - Prompt templates / library
   - Batch CSV import
   - Brand kits (saved style presets)
   - Project/folder organization

4. **Team & organization accounts**
   - Shared credit pools
   - Role-based access (admin, member)
   - Usage reporting per team member

5. **Web version**
   - Consider a web app for broader reach
   - Same backend API, SvelteKit frontend (SSR instead of static)
   - Lowers barrier to entry (no download required)

6. **API access**
   - Offer API keys for power users / developers
   - Per-key usage tracking and rate limits
   - Developer documentation

---

## 10. Open Questions

1. **Backend approach**: PocketBase (recommended for MVP) vs Supabase vs custom?
2. **Payment provider**: Stripe (recommended for flexibility) vs Paddle (easier compliance)?
3. **New brand name**: What to call it?
4. **Pricing validation**: Need to verify Kie.ai actual costs per model to set margins
5. **MVP scope**: Phases 1-3 = minimum viable commercial product?
6. **BYOK option**: Still allow "bring your own key" as a free tier?
7. **Beta strategy**: Private beta with free credits before charging?
