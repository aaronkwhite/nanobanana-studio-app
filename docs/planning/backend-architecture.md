# Backend Architecture Options

## Overview

The commercial app requires a backend API between the desktop app and Kie.ai. This backend handles auth, credit enforcement, API proxying, job management, and payment webhooks. An admin UI is needed for managing users, credits, and monitoring usage.

---

## 1. Option Comparison

### Option A: PocketBase (Recommended for MVP)

**What it is**: Single ~15MB Go binary — database (SQLite), auth, file storage, real-time subscriptions, and built-in admin dashboard in one file.

- Website: https://pocketbase.io
- Admin demo: https://pocketbase.io/demo/

**What you get for free:**
- User auth (email/password, OAuth providers)
- SQLite database with schema builder
- Built-in admin dashboard (user management, data browser, settings)
- Real-time subscriptions via SSE (good for job status updates)
- File storage (for generated images if needed)
- REST API auto-generated for all collections

**What you build:**
- Custom Go routes or JS hooks for Kie.ai proxy logic
- Credit deduction middleware
- Job queue management
- Stripe/Paddle webhook handlers

**Deployment:**
- Single binary on a $5-10/mo VPS (Hetzner, DigitalOcean, Fly.io)
- Easy to back up (it's one SQLite file)
- Horizontal scaling limited by SQLite, but fine for early stage

**Pros:**
- Fastest to ship
- Admin UI included
- Auth included
- Minimal infrastructure
- Cheap to run

**Cons:**
- SQLite may need migration to Postgres at scale
- Custom business logic requires Go or JS hooks
- Less ecosystem tooling than Node/Postgres

---

### Option B: Supabase (Managed, Production-Grade DB)

**What it is**: Managed PostgreSQL + Auth + Edge Functions + Dashboard

**What you get for free:**
- PostgreSQL database (proper relational DB from day one)
- Auth with email/password, OAuth, magic links
- Dashboard for table browsing, user management, SQL editor
- Edge Functions (Deno) for custom API logic
- Row Level Security for data isolation
- Real-time subscriptions

**What you build:**
- Edge Functions for Kie.ai proxy, credit logic, job queue
- Custom admin views (Supabase dashboard is generic)
- Webhook handlers

**Deployment:**
- Managed: Free tier, Pro at $25/mo
- Self-hosted: Docker on your own infra

**Pricing (Managed):**
- Free: 50K MAU, 500MB DB, 1GB file storage
- Pro ($25/mo): 100K MAU, 8GB DB, 100GB storage
- $0.00325/MAU beyond limits

**Pros:**
- PostgreSQL from day one (ACID, proper transactions for credits)
- Managed infrastructure
- Good auth system
- SQL editor in dashboard

**Cons:**
- Edge Functions have execution time limits
- Admin UI is a generic table viewer, not purpose-built
- Costs scale with MAU
- More complex than PocketBase for simple use cases

---

### Option C: Custom Backend (Full Control)

**What it is**: Purpose-built API service with your choice of language, database, and admin panel.

| Component | Recommended Options |
|-----------|-------------------|
| API Framework | Node.js (Hono, Express), Rust (Axum), Go (Chi, Echo) |
| Database | PostgreSQL |
| ORM | Prisma (Node), Diesel/SQLx (Rust), GORM (Go) |
| Auth | Lucia Auth, Auth.js, custom JWT |
| Admin UI | AdminJS, Retool, or custom SvelteKit app |
| Job Queue | BullMQ (Node), Tokio (Rust), Temporal |
| Hosting | Railway, Fly.io, DigitalOcean, AWS |

**Pros:**
- Complete control over every aspect
- Custom admin workflows
- No vendor lock-in
- Best performance characteristics

**Cons:**
- Most development time
- Must build/integrate auth, admin UI, real-time, etc.
- More infrastructure to manage

---

## 2. Database Schema (All Options)

### Core Tables

```sql
-- Users (handled by PocketBase/Supabase auth, or custom)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit balances
CREATE TABLE credit_balances (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,  -- credits stored as integers (avoid float math)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction log (immutable ledger)
CREATE TABLE credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,          -- 'purchase' | 'deduction' | 'refund' | 'bonus'
  amount INTEGER NOT NULL,     -- positive for credits in, negative for credits out
  balance_after INTEGER NOT NULL,
  description TEXT,            -- e.g. "100 credit pack", "1K image generation"
  reference_id TEXT,           -- job_id, stripe payment_id, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generation jobs
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | completed | failed | cancelled
  mode TEXT NOT NULL,                      -- text-to-image | image-to-image
  processing_type TEXT NOT NULL,           -- realtime | bulk
  model TEXT NOT NULL,                     -- nano-banana-pro | 4o-image | flux-kontext
  prompt TEXT NOT NULL,
  output_size TEXT NOT NULL DEFAULT '1K',
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  credits_cost INTEGER NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  kie_job_id TEXT,                         -- Kie.ai batch job reference
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual items within a job
CREATE TABLE job_items (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  input_prompt TEXT,
  input_image_url TEXT,
  output_image_url TEXT,
  error TEXT,
  credits_cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment records (synced from Stripe/Paddle webhooks)
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,       -- 'stripe' | 'paddle'
  provider_id TEXT NOT NULL,    -- Stripe payment_intent ID or Paddle transaction ID
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  credits_granted INTEGER NOT NULL,
  status TEXT NOT NULL,         -- 'completed' | 'refunded' | 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys (if offering BYOK / API access)
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  key_hash TEXT NOT NULL,
  name TEXT,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_jobs_user ON jobs(user_id, created_at DESC);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_job_items_job ON job_items(job_id);
CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);
```

---

## 3. Admin UI Requirements

### Must-Have (MVP)

| Feature | Purpose |
|---------|---------|
| User list + search | Find and view user accounts |
| User detail view | See balance, transaction history, jobs |
| Credit adjustment | Manually add/remove credits (refunds, bonuses) |
| Transaction log | View all credit movements across the system |
| Job browser | View active/failed jobs, debug issues |
| System stats | Total users, active jobs, revenue, API costs |

### Nice-to-Have (Post-MVP)

| Feature | Purpose |
|---------|---------|
| Usage analytics | Charts for generations/day, revenue, popular models |
| Cost tracking | Kie.ai spend vs revenue margin |
| User flags/notes | Mark accounts, add internal notes |
| Pricing config | Adjust credit costs per model/resolution from admin |
| Announcement system | Push messages to app users |

### Admin UI by Option

| Option | Admin UI | Customization |
|--------|----------|---------------|
| PocketBase | Built-in, covers user/data management | Extend with custom JS for credit adjustments |
| Supabase | Dashboard for tables + SQL editor | Build custom admin views or use Retool |
| Custom | Build with SvelteKit, AdminJS, or Retool | Full control |

---

## 4. API Endpoints (Backend)

### Auth
```
POST   /api/auth/register        - Create account
POST   /api/auth/login            - Login, returns JWT
POST   /api/auth/refresh          - Refresh token
POST   /api/auth/forgot-password  - Password reset email
```

### Credits
```
GET    /api/credits/balance       - Current balance
GET    /api/credits/transactions  - Transaction history (paginated)
POST   /api/credits/purchase      - Initiate purchase (returns Stripe/Paddle checkout URL)
```

### Generation
```
POST   /api/generate/realtime     - Real-time generation (immediate, higher cost)
POST   /api/generate/bulk         - Bulk generation (queued, lower cost)
GET    /api/jobs                  - List user's jobs
GET    /api/jobs/:id              - Job detail with items
DELETE /api/jobs/:id              - Cancel job
```

### Webhooks
```
POST   /api/webhooks/stripe       - Stripe payment events
POST   /api/webhooks/paddle       - Paddle payment events
```

### Admin (protected)
```
GET    /api/admin/users           - List users
GET    /api/admin/users/:id       - User detail
PATCH  /api/admin/users/:id/credits - Adjust credits
GET    /api/admin/jobs            - All jobs
GET    /api/admin/stats           - System statistics
```

---

## 5. Recommendation

**Start with PocketBase for the MVP.** It gives you auth, database, admin dashboard, and real-time in a single binary. Write the credit logic and Kie.ai proxy as custom routes. Deploy to a cheap VPS.

**Migration path:** If/when you outgrow PocketBase (high concurrency, need Postgres transactions for credits), migrate to Supabase or a custom backend. The database schema and API contract stay the same — only the implementation changes.
