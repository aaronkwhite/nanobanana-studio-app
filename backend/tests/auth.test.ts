// backend/tests/auth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

// Mock the pocketbase service module before importing the middleware
vi.mock('../src/services/pocketbase.ts', () => ({
  verifyUserToken: vi.fn(),
  getPocketBase: vi.fn(),
}));

// Import AFTER the mock is set up
import { authMiddleware } from '../src/middleware/auth.ts';
import { verifyUserToken } from '../src/services/pocketbase.ts';

describe('authMiddleware', () => {
  it('rejects requests with no Authorization header', async () => {
    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('rejects requests with missing Bearer prefix', async () => {
    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Authorization: 'invalid-token-no-bearer' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid token', async () => {
    vi.mocked(verifyUserToken).mockRejectedValueOnce(new Error('Invalid token'));

    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
  });

  it('passes valid token and sets userId in context', async () => {
    vi.mocked(verifyUserToken).mockResolvedValueOnce('user-123');

    const app = new Hono<{ Variables: { userId: string } }>();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ userId: c.get('userId') }));

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe('user-123');
  });
});
