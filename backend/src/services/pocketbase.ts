// backend/src/services/pocketbase.ts
import PocketBase from 'pocketbase';
import { env } from '../env.ts';

// Admin client — authenticates once at startup, used for all DB operations
let _pb: PocketBase | null = null;

export async function getPocketBase(): Promise<PocketBase> {
  if (_pb?.authStore.isValid) return _pb;
  _pb = new PocketBase(env.pocketbaseUrl);
  await _pb.admins.authWithPassword(env.pocketbaseAdminEmail, env.pocketbaseAdminPassword);
  return _pb;
}

// Verify a user JWT from a client request. Returns the user ID, throws on invalid.
export async function verifyUserToken(token: string): Promise<string> {
  const pb = new PocketBase(env.pocketbaseUrl);
  pb.authStore.save(token, null);
  if (!pb.authStore.isValid) throw new Error('Invalid token');

  // Confirm token is still valid server-side
  const record = await pb.collection('users').authRefresh();
  return record.record.id;
}
