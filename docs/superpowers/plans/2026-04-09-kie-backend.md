# KIE API Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Hono/TypeScript API + PocketBase backend that authenticates users, enforces a credit ledger, proxies generation requests to the KIE API (real-time and batch), and handles Stripe credit pack purchases.

**Architecture:** PocketBase (vanilla binary) handles auth, the database, and the admin UI. A Hono TypeScript service handles all business logic — credit deduction, KIE proxying, and Stripe webhooks. Both run on one VPS behind Caddy.

**Tech Stack:** Node.js 20+, TypeScript, Hono, PocketBase JS SDK (`pocketbase`), Stripe Node SDK (`stripe`), Vitest for tests, PM2 for process management.

---

## Pre-flight: KIE API Docs

Before starting, look up the actual KIE API endpoint and auth format at https://kie.ai. You'll need:
- The base URL for real-time image generation
- The base URL for batch/bulk image generation
- How job IDs are returned and how to poll batch status
- Auth header format (likely `Authorization: Bearer <api-key>`)

This plan uses placeholder URLs (`https://api.kie.ai/v1/...`). Replace them with actual endpoints as you go.

---

## File Structure

```
backend/                          ← new directory at repo root
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── src/
│   ├── index.ts                  ← Hono app, route registration, server start
│   ├── types.ts                  ← shared TypeScript types
│   ├── env.ts                    ← typed env var access (fail fast on missing vars)
│   ├── middleware/
│   │   └── auth.ts               ← JWT validation via PocketBase
│   ├── services/
│   │   ├── pocketbase.ts         ← PocketBase admin client (singleton)
│   │   ├── credits.ts            ← credit deduction + balance logic
│   │   ├── kie.ts                ← KIE API HTTP client
│   │   └── stripe.ts             ← Stripe client + webhook verification
│   └── routes/
│       ├── generate.ts           ← POST /api/generate, POST /api/generate/batch
│       ├── jobs.ts               ← GET /api/jobs/:id
│       ├── credits.ts            ← GET /api/credits/balance, POST /api/credits/purchase
│       └── webhooks.ts           ← POST /api/webhooks/stripe
└── tests/
    ├── credits.test.ts
    ├── generate.test.ts
    ├── jobs.test.ts
    └── webhooks.test.ts
```

---

## Task 1: Scaffold the Hono API Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/.env.example`
- Create: `backend/src/env.ts`
- Create: `backend/src/types.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create the backend directory and package.json**

```bash
mkdir -p backend/src/middleware backend/src/services backend/src/routes backend/tests
```

```json
// backend/package.json
{
  "name": "nana-studio-backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch --experimental-transform-types src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "hono": "^4.6.0",
    "pocketbase": "^0.21.0",
    "stripe": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 4: Create .env.example**

```bash
# backend/.env.example
POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=changeme

KIE_API_KEY=your_kie_api_key_here
KIE_BASE_URL=https://api.kie.ai/v1

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

PORT=3000
```

Copy to `.env` and fill in real values. Never commit `.env`.

- [ ] **Step 5: Create src/env.ts — fail fast if env vars are missing**

```typescript
// backend/src/env.ts
function require(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const env = {
  pocketbaseUrl: require('POCKETBASE_URL'),
  pocketbaseAdminEmail: require('POCKETBASE_ADMIN_EMAIL'),
  pocketbaseAdminPassword: require('POCKETBASE_ADMIN_PASSWORD'),
  kieApiKey: require('KIE_API_KEY'),
  kieBaseUrl: require('KIE_BASE_URL'),
  stripeSecretKey: require('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: require('STRIPE_WEBHOOK_SECRET'),
  port: parseInt(process.env.PORT ?? '3000', 10),
};
```

- [ ] **Step 6: Create src/types.ts**

```typescript
// backend/src/types.ts

// PocketBase record shapes
export interface CreditLedgerRecord {
  id: string;
  user_id: string;
  amount: number;          // positive = credit, negative = debit
  balance_after: number;
  type: 'purchase' | 'generation' | 'refund';
  reference_id: string;
  created: string;
}

export interface JobRecord {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  mode: 'realtime' | 'batch';
  model: 'nano-banana-pro' | '4o-image' | 'flux-kontext';
  credits_cost: number;
  kie_job_id: string;
  created: string;
  updated: string;
}

export interface JobItemRecord {
  id: string;
  job_id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  prompt: string;
  resolution: '1K' | '2K' | '4K';
  output_url: string;
  error: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  stripe_session_id: string;
  credits_purchased: number;
  amount_paid_cents: number;
  status: 'pending' | 'complete' | 'refunded';
}

// Request/response shapes
export interface GenerateRequest {
  model: 'nano-banana-pro' | '4o-image' | 'flux-kontext';
  resolution: '1K' | '2K' | '4K';
  prompts: string[];         // one or more prompts → one job_item each
  aspect_ratio?: string;
}

export interface GenerateBatchRequest extends GenerateRequest {
  // same shape, routed to KIE batch API
}

export interface PurchaseRequest {
  pack: 'starter' | 'standard' | 'pro';
}

// Credit pack definitions (single source of truth)
export const CREDIT_PACKS = {
  starter:  { credits: 100,   price_cents: 499  },
  standard: { credits: 500,   price_cents: 1999 },
  pro:      { credits: 1200,  price_cents: 3999 },
} as const;

// Credit cost per generation
export const CREDIT_COSTS: Record<
  JobRecord['model'],
  Record<JobItemRecord['resolution'], number>
> = {
  'nano-banana-pro': { '1K': 1, '2K': 2, '4K': 3 },
  '4o-image':        { '1K': 2, '2K': 3, '4K': 4 },   // update when KIE pricing confirmed
  'flux-kontext':    { '1K': 2, '2K': 3, '4K': 4 },   // update when KIE pricing confirmed
};

export const BATCH_DISCOUNT = 0.8; // 20% off for batch mode

export function calculateCreditCost(
  model: JobRecord['model'],
  resolution: JobItemRecord['resolution'],
  mode: JobRecord['mode'],
  count: number
): number {
  const unitCost = CREDIT_COSTS[model][resolution];
  const discount = mode === 'batch' ? BATCH_DISCOUNT : 1;
  return Math.ceil(unitCost * discount * count);
}
```

- [ ] **Step 7: Create src/index.ts — Hono app entry point**

```typescript
// backend/src/index.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './env.ts';
import generateRoutes from './routes/generate.ts';
import jobRoutes from './routes/jobs.ts';
import creditRoutes from './routes/credits.ts';
import webhookRoutes from './routes/webhooks.ts';

const app = new Hono();

app.route('/api/generate', generateRoutes);
app.route('/api/jobs', jobRoutes);
app.route('/api/credits', creditRoutes);
app.route('/api/webhooks', webhookRoutes);

app.get('/health', (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Backend running on port ${info.port}`);
});

export default app;
```

- [ ] **Step 8: Install dependencies**

```bash
cd backend && npm install
```

- [ ] **Step 9: Verify the server starts**

```bash
cd backend && cp .env.example .env
# Fill in POCKETBASE_URL=http://localhost:8090 and dummy values for the rest
npm run dev
```

Expected: `Backend running on port 3000`. Health check: `curl http://localhost:3000/health` → `{"ok":true}`

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold Hono API project"
```

---

## Task 2: Install and Configure PocketBase

**Files:**
- Create: `pocketbase/` directory at repo root (separate from `backend/`)

PocketBase runs as a standalone binary — it is not a Node project. Keep it separate.

- [ ] **Step 1: Download PocketBase**

Go to https://github.com/pocketbase/pocketbase/releases and download the latest release for your OS (macOS arm64 for local dev). Extract to `pocketbase/`:

```bash
mkdir -p pocketbase
cd pocketbase
# macOS arm64 example — check releases page for current version
curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_darwin_arm64.zip -o pb.zip
unzip pb.zip && rm pb.zip
```

- [ ] **Step 2: Start PocketBase**

```bash
cd pocketbase && ./pocketbase serve
```

Expected output includes: `Admin UI: http://127.0.0.1:8090/_/`

- [ ] **Step 3: Create admin account**

Open http://127.0.0.1:8090/_/ in your browser. Create an admin account. Use the same email/password you put in `backend/.env`.

- [ ] **Step 4: Create the `credit_ledger` collection**

In the PocketBase admin UI, go to Collections → New Collection → Base Collection. Name: `credit_ledger`.

Add fields:
- `user_id` → Relation → `users` collection, Required
- `amount` → Number, Required
- `balance_after` → Number, Required
- `type` → Select, values: `purchase, generation, refund`, Required
- `reference_id` → Text, Required

Set API rules: List/View = `@request.auth.id = user_id` (users can only see their own records). Create = admin only (no client rule). Update/Delete = disabled.

- [ ] **Step 5: Create the `jobs` collection**

Name: `jobs`. Fields:
- `user_id` → Relation → `users`, Required
- `status` → Select, values: `pending, processing, complete, failed`, Required
- `mode` → Select, values: `realtime, batch`, Required
- `model` → Text, Required
- `credits_cost` → Number, Required
- `kie_job_id` → Text

API rules: List/View = `@request.auth.id = user_id`. Create/Update/Delete = admin only.

- [ ] **Step 6: Create the `job_items` collection**

Name: `job_items`. Fields:
- `job_id` → Relation → `jobs`, Required
- `status` → Select, values: `pending, processing, complete, failed`, Required
- `prompt` → Text, Required
- `resolution` → Select, values: `1K, 2K, 4K`, Required
- `output_url` → URL
- `error` → Text

API rules: View = `@request.auth.id = job_id.user_id`. Create/Update/Delete = admin only.

- [ ] **Step 7: Create the `payments` collection**

Name: `payments`. Fields:
- `user_id` → Relation → `users`, Required
- `stripe_session_id` → Text, Required, Unique
- `credits_purchased` → Number, Required
- `amount_paid_cents` → Number, Required
- `status` → Select, values: `pending, complete, refunded`, Required

API rules: View = `@request.auth.id = user_id`. Create/Update/Delete = admin only.

- [ ] **Step 8: Add PocketBase binary to .gitignore**

```bash
echo "pocketbase/pocketbase" >> .gitignore
echo "pocketbase/pb_data/" >> .gitignore
```

- [ ] **Step 9: Commit**

```bash
git add .gitignore
git commit -m "chore: add PocketBase gitignore rules"
```

---

## Task 3: PocketBase Admin Client + Auth Middleware

**Files:**
- Create: `backend/src/services/pocketbase.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/tests/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../src/middleware/auth.ts';

describe('authMiddleware', () => {
  it('rejects requests with no Authorization header', async () => {
    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid token', async () => {
    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && npm test -- tests/auth.test.ts
```

Expected: FAIL — `authMiddleware` not found.

- [ ] **Step 3: Create src/services/pocketbase.ts**

```typescript
// backend/src/services/pocketbase.ts
import PocketBase from 'pocketbase';
import { env } from '../env.ts';

// Admin client — authenticates once at startup, refreshes automatically
let _pb: PocketBase | null = null;

export async function getPocketBase(): Promise<PocketBase> {
  if (_pb && _pb.authStore.isValid) return _pb;
  _pb = new PocketBase(env.pocketbaseUrl);
  await _pb.admins.authWithPassword(env.pocketbaseAdminEmail, env.pocketbaseAdminPassword);
  return _pb;
}

// Verify a user JWT from a client request. Returns the user ID, throws on invalid.
export async function verifyUserToken(token: string): Promise<string> {
  const pb = new PocketBase(env.pocketbaseUrl);
  pb.authStore.save(token, null);
  if (!pb.authStore.isValid) throw new Error('Invalid token');

  // Fetch user to confirm token is still valid server-side
  const record = await pb.collection('users').authRefresh();
  return record.record.id;
}
```

- [ ] **Step 4: Create src/middleware/auth.ts**

```typescript
// backend/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { verifyUserToken } from '../services/pocketbase.ts';

export const authMiddleware = createMiddleware<{
  Variables: { userId: string };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const userId = await verifyUserToken(token);
    c.set('userId', userId);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});
```

- [ ] **Step 5: Run tests**

```bash
cd backend && npm test -- tests/auth.test.ts
```

Expected: PASS (both tests pass without a real PocketBase because invalid tokens are rejected before any network call).

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/pocketbase.ts backend/src/middleware/auth.ts backend/tests/auth.test.ts
git commit -m "feat(backend): add PocketBase client and auth middleware"
```

---

## Task 4: Credit Ledger Service

**Files:**
- Create: `backend/src/services/credits.ts`
- Create: `backend/tests/credits.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/tests/credits.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateCreditCost } from '../src/types.ts';

describe('calculateCreditCost', () => {
  it('calculates realtime cost correctly', () => {
    expect(calculateCreditCost('nano-banana-pro', '1K', 'realtime', 1)).toBe(1);
    expect(calculateCreditCost('nano-banana-pro', '2K', 'realtime', 1)).toBe(2);
    expect(calculateCreditCost('nano-banana-pro', '4K', 'realtime', 1)).toBe(3);
  });

  it('applies 20% batch discount', () => {
    // 1 credit * 0.8 = 0.8, ceil = 1
    expect(calculateCreditCost('nano-banana-pro', '1K', 'batch', 1)).toBe(1);
    // 3 credits * 0.8 = 2.4, ceil = 3
    expect(calculateCreditCost('nano-banana-pro', '4K', 'batch', 1)).toBe(3);
    // 2 credits * 0.8 * 5 = 8, ceil = 8
    expect(calculateCreditCost('nano-banana-pro', '2K', 'batch', 5)).toBe(8);
  });

  it('multiplies cost by item count', () => {
    expect(calculateCreditCost('nano-banana-pro', '1K', 'realtime', 10)).toBe(10);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd backend && npm test -- tests/credits.test.ts
```

Expected: FAIL — the batch discount math may not match. Check the expected values against `calculateCreditCost` in `src/types.ts`. If any assertion is wrong, fix the test to reflect correct behavior.

- [ ] **Step 3: Run tests and confirm pass**

```bash
cd backend && npm test -- tests/credits.test.ts
```

Expected: PASS.

- [ ] **Step 4: Create src/services/credits.ts**

```typescript
// backend/src/services/credits.ts
import { getPocketBase } from './pocketbase.ts';
import type { CreditLedgerRecord, JobRecord, JobItemRecord } from '../types.ts';
import { calculateCreditCost } from '../types.ts';

// Returns the user's current credit balance.
// Uses the balance_after snapshot on the most recent record for speed.
export async function getBalance(userId: string): Promise<number> {
  const pb = await getPocketBase();
  try {
    const record = await pb.collection('credit_ledger').getFirstListItem<CreditLedgerRecord>(
      `user_id = "${userId}"`,
      { sort: '-created', fields: 'balance_after' }
    );
    return record.balance_after;
  } catch {
    // No records = zero balance
    return 0;
  }
}

// Deducts credits for a generation job.
// Returns the new balance. Throws if insufficient credits.
export async function deductCredits(params: {
  userId: string;
  model: JobRecord['model'];
  resolution: JobItemRecord['resolution'];
  mode: JobRecord['mode'];
  count: number;
  referenceId: string;
}): Promise<number> {
  const pb = await getPocketBase();
  const cost = calculateCreditCost(params.model, params.resolution, params.mode, params.count);
  const currentBalance = await getBalance(params.userId);

  if (currentBalance < cost) {
    throw new Error(`Insufficient credits: have ${currentBalance}, need ${cost}`);
  }

  const newBalance = currentBalance - cost;
  await pb.collection('credit_ledger').create<CreditLedgerRecord>({
    user_id: params.userId,
    amount: -cost,
    balance_after: newBalance,
    type: 'generation',
    reference_id: params.referenceId,
  });

  return newBalance;
}

// Credits a user's account (used after Stripe payment or KIE job refund).
export async function creditAccount(params: {
  userId: string;
  amount: number;
  type: 'purchase' | 'refund';
  referenceId: string;
}): Promise<number> {
  const pb = await getPocketBase();
  const currentBalance = await getBalance(params.userId);
  const newBalance = currentBalance + params.amount;

  await pb.collection('credit_ledger').create<CreditLedgerRecord>({
    user_id: params.userId,
    amount: params.amount,
    balance_after: newBalance,
    type: params.type,
    reference_id: params.referenceId,
  });

  return newBalance;
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/credits.ts backend/tests/credits.test.ts
git commit -m "feat(backend): add credit ledger service"
```

---

## Task 5: GET /api/credits/balance Route

**Files:**
- Create: `backend/src/routes/credits.ts`
- Modify: `backend/tests/credits.test.ts`

- [ ] **Step 1: Add route test**

Append to `backend/tests/credits.test.ts`:

```typescript
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { authMiddleware } from '../src/middleware/auth.ts';
import creditRoutes from '../src/routes/credits.ts';

// Mock the credits service
vi.mock('../src/services/credits.ts', () => ({
  getBalance: vi.fn().mockResolvedValue(42),
  creditAccount: vi.fn(),
}));

// Mock auth middleware to inject a fake userId
vi.mock('../src/middleware/auth.ts', () => ({
  authMiddleware: createMiddleware<{ Variables: { userId: string } }>(async (c, next) => {
    c.set('userId', 'user-123');
    await next();
  }),
}));

describe('GET /api/credits/balance', () => {
  it('returns the user credit balance', async () => {
    const app = new Hono();
    app.use('*', authMiddleware);
    app.route('/', creditRoutes);

    const res = await app.request('/balance');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.balance).toBe(42);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && npm test -- tests/credits.test.ts
```

Expected: FAIL — `creditRoutes` not found.

- [ ] **Step 3: Create src/routes/credits.ts**

```typescript
// backend/src/routes/credits.ts
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.ts';
import { getBalance } from '../services/credits.ts';
import { getStripe } from '../services/stripe.ts';
import { CREDIT_PACKS } from '../types.ts';
import type { PurchaseRequest } from '../types.ts';

const credits = new Hono<{ Variables: { userId: string } }>();

credits.use('*', authMiddleware);

credits.get('/balance', async (c) => {
  const userId = c.get('userId');
  const balance = await getBalance(userId);
  return c.json({ balance });
});

credits.post('/purchase', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<PurchaseRequest>();

  const pack = CREDIT_PACKS[body.pack];
  if (!pack) return c.json({ error: 'Invalid pack' }, 400);

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: pack.price_cents,
        product_data: {
          name: `${pack.credits} Credits`,
          description: `Nana Studio credit pack`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      user_id: userId,
      pack: body.pack,
      credits: pack.credits.toString(),
    },
    success_url: 'nana-studio://credits/success',
    cancel_url: 'nana-studio://credits/cancel',
  });

  return c.json({ url: session.url });
});

export default credits;
```

- [ ] **Step 4: Run tests**

```bash
cd backend && npm test -- tests/credits.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/credits.ts backend/tests/credits.test.ts
git commit -m "feat(backend): add credit balance and purchase routes"
```

---

## Task 6: KIE API Client

**Files:**
- Create: `backend/src/services/kie.ts`

> Before writing this task, confirm the actual KIE API endpoints and response shapes from https://kie.ai API docs. Update the URL constants and type shapes below to match.

- [ ] **Step 1: Create src/services/kie.ts**

```typescript
// backend/src/services/kie.ts
import { env } from '../env.ts';
import type { GenerateRequest, JobRecord, JobItemRecord } from '../types.ts';

// KIE API response types — update to match actual API docs
interface KieRealtimeResponse {
  job_id: string;
  status: string;
  output_urls?: string[];
  error?: string;
}

interface KieBatchResponse {
  batch_id: string;
  status: string;
}

interface KieBatchStatusResponse {
  batch_id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  results?: Array<{ prompt: string; output_url: string; error?: string }>;
}

// Map our model names to KIE model IDs — update when you have real API docs
const KIE_MODEL_IDS: Record<string, string> = {
  'nano-banana-pro': 'nano-banana-pro',  // update with actual KIE model ID
  '4o-image': '4o-image',               // update with actual KIE model ID
  'flux-kontext': 'flux-kontext',       // update with actual KIE model ID
};

async function kiePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${env.kieBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.kieApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

async function kieGet<T>(path: string): Promise<T> {
  const res = await fetch(`${env.kieBaseUrl}${path}`, {
    headers: { 'Authorization': `Bearer ${env.kieApiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// Submit a single real-time generation. Returns KIE job ID.
export async function submitRealtime(request: GenerateRequest): Promise<string> {
  const response = await kiePost<KieRealtimeResponse>('/generate', {
    model: KIE_MODEL_IDS[request.model],
    resolution: request.resolution,
    prompts: request.prompts,
    aspect_ratio: request.aspect_ratio ?? '1:1',
  });
  return response.job_id;
}

// Submit a batch generation job. Returns KIE batch ID.
export async function submitBatch(request: GenerateRequest): Promise<string> {
  const response = await kiePost<KieBatchResponse>('/generate/batch', {
    model: KIE_MODEL_IDS[request.model],
    resolution: request.resolution,
    prompts: request.prompts,
    aspect_ratio: request.aspect_ratio ?? '1:1',
  });
  return response.batch_id;
}

// Poll a batch job status. Called by background poller.
export async function getBatchStatus(batchId: string): Promise<KieBatchStatusResponse> {
  return kieGet<KieBatchStatusResponse>(`/generate/batch/${batchId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/kie.ts
git commit -m "feat(backend): add KIE API client service"
```

---

## Task 7: POST /api/generate (Real-time)

**Files:**
- Create: `backend/src/routes/generate.ts`
- Create: `backend/tests/generate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/generate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

vi.mock('../src/services/credits.ts', () => ({
  deductCredits: vi.fn().mockResolvedValue(99),
  creditAccount: vi.fn(),
}));
vi.mock('../src/services/kie.ts', () => ({
  submitRealtime: vi.fn().mockResolvedValue('kie-job-123'),
  submitBatch: vi.fn().mockResolvedValue('kie-batch-456'),
}));
vi.mock('../src/services/pocketbase.ts', () => ({
  getPocketBase: vi.fn().mockResolvedValue({
    collection: () => ({
      create: vi.fn().mockResolvedValue({ id: 'job-abc', expand: { job_items: [] } }),
    }),
  }),
}));
vi.mock('../src/middleware/auth.ts', () => ({
  authMiddleware: createMiddleware<{ Variables: { userId: string } }>(async (c, next) => {
    c.set('userId', 'user-123');
    await next();
  }),
}));

import generateRoutes from '../src/routes/generate.ts';
import { deductCredits } from '../src/services/credits.ts';

describe('POST /api/generate', () => {
  it('returns 400 if prompts array is empty', async () => {
    const app = new Hono();
    app.route('/', generateRoutes);
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nano-banana-pro', resolution: '1K', prompts: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('deducts credits and returns job id on success', async () => {
    const app = new Hono();
    app.route('/', generateRoutes);
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nano-banana-pro',
        resolution: '1K',
        prompts: ['a cat'],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job_id).toBeDefined();
    expect(deductCredits).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && npm test -- tests/generate.test.ts
```

Expected: FAIL — `generateRoutes` not found.

- [ ] **Step 3: Create src/routes/generate.ts**

```typescript
// backend/src/routes/generate.ts
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.ts';
import { deductCredits, creditAccount } from '../services/credits.ts';
import { submitRealtime, submitBatch } from '../services/kie.ts';
import { getPocketBase } from '../services/pocketbase.ts';
import type { GenerateRequest, JobRecord } from '../types.ts';
import { calculateCreditCost } from '../types.ts';

const generate = new Hono<{ Variables: { userId: string } }>();
generate.use('*', authMiddleware);

async function createJob(params: {
  userId: string;
  mode: JobRecord['mode'];
  model: JobRecord['model'];
  creditsCost: number;
  kieJobId: string;
  prompts: string[];
  resolution: string;
}) {
  const pb = await getPocketBase();
  const job = await pb.collection('jobs').create({
    user_id: params.userId,
    status: 'pending',
    mode: params.mode,
    model: params.model,
    credits_cost: params.creditsCost,
    kie_job_id: params.kieJobId,
  });

  await Promise.all(
    params.prompts.map((prompt) =>
      pb.collection('job_items').create({
        job_id: job.id,
        status: 'pending',
        prompt,
        resolution: params.resolution,
      })
    )
  );

  return job.id;
}

generate.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<GenerateRequest>();

  if (!body.prompts?.length) return c.json({ error: 'prompts required' }, 400);
  if (!body.model || !body.resolution) return c.json({ error: 'model and resolution required' }, 400);

  const jobId = crypto.randomUUID();
  // Calculate cost up front so we have it for refunds and job records
  const creditsCost = calculateCreditCost(body.model, body.resolution, 'realtime', body.prompts.length);

  try {
    await deductCredits({
      userId,
      model: body.model,
      resolution: body.resolution,
      mode: 'realtime',
      count: body.prompts.length,
      referenceId: jobId,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('Insufficient')) {
      return c.json({ error: err.message }, 402);
    }
    throw err;
  }

  let kieJobId: string;
  try {
    kieJobId = await submitRealtime(body);
  } catch (err) {
    // KIE failed — refund the credits we just deducted
    await creditAccount({ userId, amount: creditsCost, type: 'refund', referenceId: jobId });
    throw err;
  }

  const storedJobId = await createJob({
    userId,
    mode: 'realtime',
    model: body.model,
    creditsCost,
    kieJobId,
    prompts: body.prompts,
    resolution: body.resolution,
  });

  return c.json({ job_id: storedJobId });
});

generate.post('/batch', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<GenerateRequest>();

  if (!body.prompts?.length) return c.json({ error: 'prompts required' }, 400);
  if (!body.model || !body.resolution) return c.json({ error: 'model and resolution required' }, 400);

  const jobId = crypto.randomUUID();
  const creditsCost = calculateCreditCost(body.model, body.resolution, 'batch', body.prompts.length);

  try {
    await deductCredits({
      userId,
      model: body.model,
      resolution: body.resolution,
      mode: 'batch',
      count: body.prompts.length,
      referenceId: jobId,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('Insufficient')) {
      return c.json({ error: err.message }, 402);
    }
    throw err;
  }

  let kieJobId: string;
  try {
    kieJobId = await submitBatch(body);
  } catch (err) {
    await creditAccount({ userId, amount: creditsCost, type: 'refund', referenceId: jobId });
    throw err;
  }

  const storedJobId = await createJob({
    userId,
    mode: 'batch',
    model: body.model,
    creditsCost,
    kieJobId,
    prompts: body.prompts,
    resolution: body.resolution,
  });

  return c.json({ job_id: storedJobId });
});

export default generate;
```

- [ ] **Step 4: Run tests**

```bash
cd backend && npm test -- tests/generate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/generate.ts backend/tests/generate.test.ts
git commit -m "feat(backend): add real-time and batch generate routes"
```

---

## Task 8: GET /api/jobs/:id Route

**Files:**
- Create: `backend/src/routes/jobs.ts`
- Create: `backend/tests/jobs.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/jobs.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

vi.mock('../src/middleware/auth.ts', () => ({
  authMiddleware: createMiddleware<{ Variables: { userId: string } }>(async (c, next) => {
    c.set('userId', 'user-123');
    await next();
  }),
}));

vi.mock('../src/services/pocketbase.ts', () => ({
  getPocketBase: vi.fn().mockResolvedValue({
    collection: (name: string) => ({
      getOne: vi.fn().mockImplementation((id: string) => {
        if (name === 'jobs' && id === 'job-abc') {
          return Promise.resolve({ id: 'job-abc', user_id: 'user-123', status: 'complete' });
        }
        throw new Error('Not found');
      }),
      getFullList: vi.fn().mockResolvedValue([
        { id: 'item-1', job_id: 'job-abc', status: 'complete', output_url: 'https://example.com/img.png' },
      ]),
    }),
  }),
}));

import jobRoutes from '../src/routes/jobs.ts';

describe('GET /api/jobs/:id', () => {
  it('returns 404 for unknown job id', async () => {
    const app = new Hono();
    app.route('/', jobRoutes);
    const res = await app.request('/unknown-job');
    expect(res.status).toBe(404);
  });

  it('returns job with items for valid id', async () => {
    const app = new Hono();
    app.route('/', jobRoutes);
    const res = await app.request('/job-abc');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job.id).toBe('job-abc');
    expect(body.items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && npm test -- tests/jobs.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create src/routes/jobs.ts**

```typescript
// backend/src/routes/jobs.ts
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.ts';
import { getPocketBase } from '../services/pocketbase.ts';

const jobs = new Hono<{ Variables: { userId: string } }>();
jobs.use('*', authMiddleware);

jobs.get('/:id', async (c) => {
  const userId = c.get('userId');
  const jobId = c.req.param('id');
  const pb = await getPocketBase();

  try {
    const job = await pb.collection('jobs').getOne(jobId);
    if (job.user_id !== userId) return c.json({ error: 'Not found' }, 404);

    const items = await pb.collection('job_items').getFullList({
      filter: `job_id = "${jobId}"`,
    });

    return c.json({ job, items });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});

export default jobs;
```

- [ ] **Step 4: Run tests**

```bash
cd backend && npm test -- tests/jobs.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/jobs.ts backend/tests/jobs.test.ts
git commit -m "feat(backend): add job status route"
```

---

## Task 9: Batch Job Background Poller

**Files:**
- Create: `backend/src/services/batch-poller.ts`
- Modify: `backend/src/index.ts`

The batch poller runs in the background, checking KIE for completed batch jobs and updating PocketBase records.

- [ ] **Step 1: Create src/services/batch-poller.ts**

```typescript
// backend/src/services/batch-poller.ts
import { getPocketBase } from './pocketbase.ts';
import { getBatchStatus } from './kie.ts';
import { creditAccount } from './credits.ts';
import type { JobRecord } from '../types.ts';

const POLL_INTERVAL_MS = 10_000; // poll every 10 seconds

export function startBatchPoller(): void {
  setInterval(pollBatchJobs, POLL_INTERVAL_MS);
  console.log('Batch poller started');
}

async function pollBatchJobs(): Promise<void> {
  const pb = await getPocketBase();
  const pendingJobs = await pb.collection('jobs').getFullList<JobRecord>({
    filter: 'mode = "batch" && (status = "pending" || status = "processing")',
  });

  for (const job of pendingJobs) {
    if (!job.kie_job_id) continue;

    try {
      const kieStatus = await getBatchStatus(job.kie_job_id);

      if (kieStatus.status === 'complete' && kieStatus.results) {
        // Update each job_item with results
        const items = await pb.collection('job_items').getFullList({
          filter: `job_id = "${job.id}"`,
        });

        for (let i = 0; i < items.length; i++) {
          const result = kieStatus.results[i];
          if (result) {
            await pb.collection('job_items').update(items[i].id, {
              status: result.error ? 'failed' : 'complete',
              output_url: result.output_url ?? '',
              error: result.error ?? '',
            });
          }
        }

        await pb.collection('jobs').update(job.id, { status: 'complete' });

      } else if (kieStatus.status === 'failed') {
        // Refund credits on batch failure
        await pb.collection('jobs').update(job.id, { status: 'failed' });
        await creditAccount({
          userId: job.user_id,
          amount: job.credits_cost,
          type: 'refund',
          referenceId: job.id,
        });

      } else if (kieStatus.status === 'processing') {
        await pb.collection('jobs').update(job.id, { status: 'processing' });
      }
    } catch (err) {
      console.error(`Failed to poll batch job ${job.id}:`, err);
    }
  }
}
```

- [ ] **Step 2: Start the poller in src/index.ts**

Add to `backend/src/index.ts` after the route registrations:

```typescript
import { startBatchPoller } from './services/batch-poller.ts';

// ... (existing app setup) ...

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Backend running on port ${info.port}`);
  startBatchPoller();
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/batch-poller.ts backend/src/index.ts
git commit -m "feat(backend): add batch job background poller"
```

---

## Task 10: Stripe Integration + Webhook Handler

**Files:**
- Create: `backend/src/services/stripe.ts`
- Create: `backend/src/routes/webhooks.ts`
- Create: `backend/tests/webhooks.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/webhooks.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

vi.mock('../src/services/stripe.ts', () => ({
  getStripe: vi.fn(),
  constructWebhookEvent: vi.fn(),
}));
vi.mock('../src/services/credits.ts', () => ({
  creditAccount: vi.fn().mockResolvedValue(100),
}));
vi.mock('../src/services/pocketbase.ts', () => ({
  getPocketBase: vi.fn().mockResolvedValue({
    collection: () => ({
      getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
      create: vi.fn().mockResolvedValue({}),
    }),
  }),
}));

import webhookRoutes from '../src/routes/webhooks.ts';
import { constructWebhookEvent } from '../src/services/stripe.ts';
import { creditAccount } from '../src/services/credits.ts';

describe('POST /api/webhooks/stripe', () => {
  it('credits user on checkout.session.completed event', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: { user_id: 'user-abc', pack: 'starter', credits: '100' },
          amount_total: 499,
        },
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    const app = new Hono();
    app.route('/', webhookRoutes);

    const res = await app.request('/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-sig',
      },
      body: JSON.stringify(mockEvent),
    });

    expect(res.status).toBe(200);
    expect(creditAccount).toHaveBeenCalledWith({
      userId: 'user-abc',
      amount: 100,
      type: 'purchase',
      referenceId: 'cs_test_123',
    });
  });

  it('returns 400 on invalid signature', async () => {
    vi.mocked(constructWebhookEvent).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const app = new Hono();
    app.route('/', webhookRoutes);

    const res = await app.request('/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'bad-sig' },
      body: '{}',
    });

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && npm test -- tests/webhooks.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create src/services/stripe.ts**

```typescript
// backend/src/services/stripe.ts
import Stripe from 'stripe';
import { env } from '../env.ts';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.stripeSecretKey, { apiVersion: '2024-11-20.acacia' });
  }
  return _stripe;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
}
```

- [ ] **Step 4: Create src/routes/webhooks.ts**

```typescript
// backend/src/routes/webhooks.ts
import { Hono } from 'hono';
import { constructWebhookEvent } from '../services/stripe.ts';
import { creditAccount } from '../services/credits.ts';
import { getPocketBase } from '../services/pocketbase.ts';

const webhooks = new Hono();

webhooks.post('/stripe', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) return c.json({ error: 'Missing signature' }, 400);

  const rawBody = await c.req.text();
  let event: ReturnType<typeof constructWebhookEvent>;

  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      metadata: { user_id: string; pack: string; credits: string };
      amount_total: number;
    };

    const { user_id, credits } = session.metadata;
    const pb = await getPocketBase();

    // Deduplication: skip if this session was already processed
    try {
      await pb.collection('payments').getFirstListItem(`stripe_session_id = "${session.id}"`);
      // Already processed — return 200 to acknowledge
      return c.json({ received: true });
    } catch {
      // Not found = not yet processed, proceed
    }

    await creditAccount({
      userId: user_id,
      amount: parseInt(credits, 10),
      type: 'purchase',
      referenceId: session.id,
    });

    await pb.collection('payments').create({
      user_id,
      stripe_session_id: session.id,
      credits_purchased: parseInt(credits, 10),
      amount_paid_cents: session.amount_total,
      status: 'complete',
    });
  }

  return c.json({ received: true });
});

export default webhooks;
```

- [ ] **Step 5: Run tests**

```bash
cd backend && npm test -- tests/webhooks.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run all tests**

```bash
cd backend && npm test
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/stripe.ts backend/src/routes/webhooks.ts backend/tests/webhooks.test.ts
git commit -m "feat(backend): add Stripe service and webhook handler"
```

---

## Task 11: Deployment Config

**Files:**
- Create: `backend/ecosystem.config.cjs` (PM2 config)
- Create: `deploy/Caddyfile`

- [ ] **Step 1: Create PM2 config**

```javascript
// backend/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'nana-backend',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--experimental-transform-types',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

- [ ] **Step 2: Create Caddyfile**

```
# deploy/Caddyfile
# Replace yourdomain.com with your actual domain

api.yourdomain.com {
    reverse_proxy localhost:3000
}

pb.yourdomain.com {
    reverse_proxy localhost:8090
    # Restrict admin access by IP — replace with your IP
    @admin path /_/*
    handle @admin {
        # basicauth admin {
        #   admin JDJhJDE0J...  # bcrypt hash of your password
        # }
        reverse_proxy localhost:8090
    }
}
```

- [ ] **Step 3: Document VPS setup steps**

On the VPS (Hetzner Ubuntu 22.04 recommended):

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Upload and start PocketBase
./pocketbase serve --http="127.0.0.1:8090" &

# Upload backend, install deps, start with PM2
cd backend && npm install --production
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup

# Start Caddy with your Caddyfile
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

- [ ] **Step 4: Commit**

```bash
git add backend/ecosystem.config.cjs deploy/Caddyfile
git commit -m "chore: add PM2 and Caddy deployment config"
```

---

## Task 12: End-to-End Smoke Test

Manually verify the full backend flow before moving to the desktop app plan.

- [ ] **Step 1: Start both services locally**

```bash
# Terminal 1
cd pocketbase && ./pocketbase serve

# Terminal 2
cd backend && npm run dev
```

- [ ] **Step 2: Create a test user via PocketBase admin UI**

Open http://localhost:8090/_/ → Users → New User. Note the user ID.

- [ ] **Step 3: Get an auth token**

```bash
curl -X POST http://localhost:8090/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"test@example.com","password":"testpass123"}'
```

Copy the `token` from the response.

- [ ] **Step 4: Manually add 10 credits via PocketBase admin**

In PocketBase admin UI → credit_ledger → New Record:
- `user_id`: your test user ID
- `amount`: 10
- `balance_after`: 10
- `type`: purchase
- `reference_id`: manual-test

- [ ] **Step 5: Check balance via API**

```bash
curl http://localhost:3000/api/credits/balance \
  -H "Authorization: Bearer <your-token>"
```

Expected: `{"balance":10}`

- [ ] **Step 6: Submit a generate request (will fail at KIE step without real key — that's ok)**

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"model":"nano-banana-pro","resolution":"1K","prompts":["a cat"]}'
```

Expected with real KIE key: `{"job_id":"..."}`. Without a real key: KIE error is thrown, credits are refunded automatically.

- [ ] **Step 7: Verify balance is unchanged after a KIE failure**

```bash
curl http://localhost:3000/api/credits/balance \
  -H "Authorization: Bearer <your-token>"
```

Expected: still `{"balance":10}` — refund worked.

---

## Plan 1 Complete

Next: see `docs/superpowers/plans/2026-04-09-kie-desktop-app.md` for the desktop app implementation (auth screen, credit balance UI, model picker, mode toggle, replacing Gemini calls).
