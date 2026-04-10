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
          description: 'Nana Studio credit pack',
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
