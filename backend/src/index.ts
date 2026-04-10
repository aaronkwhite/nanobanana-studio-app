// backend/src/index.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './env.ts';
import creditRoutes from './routes/credits.ts';

const app = new Hono();

app.route('/api/credits', creditRoutes);
app.get('/health', (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Backend running on port ${info.port}`);
});

export default app;
