// backend/tests/credits-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

// Mock pocketbase so we can control verifyUserToken in auth rejection tests
vi.mock('../src/services/pocketbase.ts', () => ({
  verifyUserToken: vi.fn(),
  getPocketBase: vi.fn(),
}));

// Mock auth middleware to inject fake userId
vi.mock('../src/middleware/auth.ts', () => ({
  authMiddleware: createMiddleware<{ Variables: { userId: string } }>(async (c, next) => {
    c.set('userId', 'user-123');
    await next();
  }),
}));

// Mock credits service
vi.mock('../src/services/credits.ts', () => ({
  getBalance: vi.fn().mockResolvedValue(42),
  deductCredits: vi.fn(),
  creditAccount: vi.fn(),
}));

// Mock stripe service
vi.mock('../src/services/stripe.ts', () => ({
  getStripe: vi.fn().mockReturnValue({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/pay/test_123' }),
      },
    },
  }),
}));

import creditRoutes from '../src/routes/credits.ts';
import { getBalance } from '../src/services/credits.ts';
import { getStripe } from '../src/services/stripe.ts';
import { verifyUserToken } from '../src/services/pocketbase.ts';

describe('GET /balance', () => {
  it('returns the user credit balance', async () => {
    const app = new Hono();
    app.route('/', creditRoutes);

    const res = await app.request('/balance');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.balance).toBe(42);
    expect(getBalance).toHaveBeenCalledWith('user-123');
  });
});

describe('POST /purchase', () => {
  it('returns 400 for invalid pack', async () => {
    const app = new Hono();
    app.route('/', creditRoutes);

    const res = await app.request('/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: 'invalid-pack' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns Stripe checkout URL for valid pack', async () => {
    const app = new Hono();
    app.route('/', creditRoutes);

    const res = await app.request('/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: 'starter' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/pay/test_123');

    const stripe = getStripe();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          user_id: 'user-123',
          pack: 'starter',
          credits: expect.any(String),
        },
      })
    );
  });

  it('returns 400 for malformed body', async () => {
    const app = new Hono();
    app.route('/', creditRoutes);

    const res = await app.request('/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not-json',
    });
    expect(res.status).toBe(400);
  });
});

describe('auth rejection', () => {
  beforeEach(() => {
    vi.mocked(verifyUserToken).mockReset();
  });

  it('returns 401 for bad token', async () => {
    vi.mocked(verifyUserToken).mockRejectedValueOnce(new Error('Invalid token'));

    // Import the real auth middleware (bypassing the module-level mock)
    const { authMiddleware: realAuth } = await vi.importActual<
      typeof import('../src/middleware/auth.ts')
    >('../src/middleware/auth.ts');

    const app = new Hono<{ Variables: { userId: string } }>();
    app.use('*', realAuth);
    app.route('/', creditRoutes);

    const res = await app.request('/balance', {
      headers: { Authorization: 'Bearer badtoken' },
    });
    expect(res.status).toBe(401);
  });
});
