// backend/src/env.ts
function require(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const env = {
  pocketbaseUrl: require('POCKETBASE_URL'),
  pocketbaseAdminEmail: require('POCKETBASE_ADMIN_EMAIL'),
  pocketbaseAdminPassword: require('POCKETBASE_ADMIN_PASSWORD'),
  kieApiKey: require('KIE_API_KEY'),
  kieBaseUrl: require('KIE_BASE_URL'),
  stripeSecretKey: require('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: require('STRIPE_WEBHOOK_SECRET'),
  port: parseInt(process.env.PORT ?? '3000', 10),
};
