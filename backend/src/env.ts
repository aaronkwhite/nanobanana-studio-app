// backend/src/env.ts
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const env = {
  pocketbaseUrl: requireEnv('POCKETBASE_URL'),
  pocketbaseAdminEmail: requireEnv('POCKETBASE_ADMIN_EMAIL'),
  pocketbaseAdminPassword: requireEnv('POCKETBASE_ADMIN_PASSWORD'),
  kieApiKey: requireEnv('KIE_API_KEY'),
  kieBaseUrl: requireEnv('KIE_BASE_URL'),
  stripeSecretKey: requireEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET'),
  port: parseInt(process.env.PORT ?? '3000', 10),
};
