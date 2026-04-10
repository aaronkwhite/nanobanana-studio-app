// backend/src/services/pocketbase.ts
import PocketBase from 'pocketbase';
import { env } from '../env.ts';

// Admin client — authenticates once at startup, used for all DB operations
let _pb: PocketBase | null = null;
let _authPromise: Promise<PocketBase> | null = null;

export function getPocketBase(): Promise<PocketBase> {
  if (_pb?.authStore.isValid) return Promise.resolve(_pb);
  if (_authPromise) return _authPromise;

  _authPromise = (async () => {
    _pb = new PocketBase(env.pocketbaseUrl);
    await _pb.admins.authWithPassword(env.pocketbaseAdminEmail, env.pocketbaseAdminPassword);
    _authPromise = null;
    return _pb;
  })();

  return _authPromise;
}

// Verify a user JWT from a client request. Returns the user ID, throws on invalid.
export async function verifyUserToken(token: string): Promise<string> {
  const pb = new PocketBase(env.pocketbaseUrl);
  pb.authStore.save(token, null);
  // isValid is a client-side expiry check only — NOT a signature verification.
  // The authRefresh() call below is the actual server-side validation.
  if (!pb.authStore.isValid) throw new Error('Invalid token');

  // Confirm token is still valid server-side
  const record = await pb.collection('users').authRefresh();
  return record.record.id;
}
