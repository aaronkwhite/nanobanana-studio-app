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
