// backend/src/index.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './env.ts';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Backend running on port ${info.port}`);
});

export default app;
