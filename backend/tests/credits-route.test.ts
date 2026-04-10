// backend/tests/credits-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

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
  });
});
