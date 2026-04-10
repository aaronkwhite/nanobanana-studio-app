// backend/src/services/stripe.ts
import Stripe from 'stripe';
import { env } from '../env.ts';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.stripeSecretKey, { apiVersion: '2024-11-20.acacia' });
  }
  return _stripe;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
}
