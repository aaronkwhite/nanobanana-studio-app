// backend/src/routes/webhooks.ts
import { Hono } from 'hono';
import { constructWebhookEvent } from '../services/stripe.ts';
import { creditAccount } from '../services/credits.ts';
import { getPocketBase } from '../services/pocketbase.ts';

const webhooks = new Hono();

webhooks.post('/stripe', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) return c.json({ error: 'Missing signature' }, 400);

  const rawBody = await c.req.text();
  let event: ReturnType<typeof constructWebhookEvent>;

  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      metadata: { user_id: string; pack: string; credits: string };
      amount_total: number;
    };

    const { user_id, credits } = session.metadata;
    const pb = await getPocketBase();

    // Deduplication: skip if this session was already processed
    try {
      await pb.collection('payments').getFirstListItem(
        'stripe_session_id = {:sessionId}',
        { sessionId: session.id }
      );
      // Already processed — acknowledge without re-crediting
      return c.json({ received: true });
    } catch {
      // Not found = not yet processed, proceed
    }

    // Write payment record first (acts as the dedup lock)
    await pb.collection('payments').create({
      user_id,
      stripe_session_id: session.id,
      credits_purchased: parseInt(credits, 10),
      amount_paid_cents: session.amount_total,
      status: 'complete',
    });

    // Then credit the account
    await creditAccount({
      userId: user_id,
      amount: parseInt(credits, 10),
      type: 'purchase',
      referenceId: session.id,
    });
  }

  return c.json({ received: true });
});

export default webhooks;
