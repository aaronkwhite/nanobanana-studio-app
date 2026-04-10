// backend/tests/webhooks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('../src/services/stripe.ts', () => ({
  getStripe: vi.fn(),
  constructWebhookEvent: vi.fn(),
}));
vi.mock('../src/services/credits.ts', () => ({
  creditAccount: vi.fn().mockResolvedValue(100),
  deductCredits: vi.fn(),
  getBalance: vi.fn(),
}));
// Helper to create a mock PocketBase instance with filter method
function createMockPocketBase(getFirstListItemFn: any) {
  return {
    filter: vi.fn((template: string, params: Record<string, any>) => {
      // Simulate PocketBase filter substitution: replace {:paramName} with the actual value
      return template.replace(/{:(\w+)}/g, (_, key) => {
        const value = params[key];
        return typeof value === 'string' ? `'${value}'` : String(value);
      });
    }),
    collection: () => ({
      getFirstListItem: getFirstListItemFn,
      create: vi.fn().mockResolvedValue({}),
    }),
  } as any;
}

vi.mock('../src/services/pocketbase.ts', () => ({
  getPocketBase: vi.fn().mockResolvedValue(
    createMockPocketBase(vi.fn().mockRejectedValue(new Error('Not found')))
  ),
}));

import webhookRoutes from '../src/routes/webhooks.ts';
import { constructWebhookEvent } from '../src/services/stripe.ts';
import { creditAccount } from '../src/services/credits.ts';
import { getPocketBase } from '../src/services/pocketbase.ts';

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.mocked(constructWebhookEvent).mockReset();
    vi.mocked(creditAccount).mockReset();
    vi.mocked(getPocketBase).mockReset();
    vi.mocked(getPocketBase).mockResolvedValue(
      createMockPocketBase(vi.fn().mockRejectedValue(new Error('Not found')))
    );
  });

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

  it('returns 200 without crediting on duplicate session', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_already_processed',
          metadata: { user_id: 'user-abc', pack: 'starter', credits: '100' },
          amount_total: 499,
        },
      },
    };

    vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any);

    // Override PocketBase mock: getFirstListItem succeeds (session already in payments)
    const mockGetFirstListItem = vi.fn().mockResolvedValue({ id: 'payment-123' });
    vi.mocked(getPocketBase).mockResolvedValueOnce(
      createMockPocketBase(mockGetFirstListItem)
    );

    const app = new Hono();
    app.route('/', webhookRoutes);

    const res = await app.request('/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'test-sig', 'Content-Type': 'application/json' },
      body: JSON.stringify(mockEvent),
    });

    expect(res.status).toBe(200);
    expect(creditAccount).not.toHaveBeenCalled();
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const app = new Hono();
    app.route('/', webhookRoutes);

    const res = await app.request('/stripe', {
      method: 'POST',
      body: '{}',
    });
    expect(res.status).toBe(400);
  });
});
