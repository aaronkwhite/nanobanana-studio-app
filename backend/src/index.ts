// backend/src/index.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './env.ts';
import creditRoutes from './routes/credits.ts';
import generateRoutes from './routes/generate.ts';
import jobRoutes from './routes/jobs.ts';
import webhookRoutes from './routes/webhooks.ts';
import { startBatchPoller } from './services/batch-poller.ts';

const app = new Hono();

app.route('/api/credits', creditRoutes);
app.route('/api/generate', generateRoutes);
app.route('/api/jobs', jobRoutes);
app.route('/api/webhooks', webhookRoutes);
app.get('/health', (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Backend running on port ${info.port}`);
  startBatchPoller();
});

export default app;
