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
    const app = new Hono();
    app.use('*', authMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
  });
});
