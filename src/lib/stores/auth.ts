// src/lib/stores/auth.ts
import { writable, derived } from 'svelte/store';
import type { AuthState } from '$lib/types';
import * as cmd from '$lib/utils/commands';

function createAuthStore() {
  const { subscribe, set } = writable<AuthState | null>(null);

  return {
    subscribe,
    async load(): Promise<AuthState | null> {
      try {
        const state = await cmd.getAuthState();
        set(state);
        return state;
      } catch {
        // Keychain/store unavailable — treat as unauthenticated
        set(null);
        return null;
      }
    },
    async login(email: string, password: string): Promise<void> {
      const state = await cmd.login(email, password);
      set(state);
    },
    async logout(): Promise<void> {
      await cmd.logout();
      set(null);
    },
  };
}

export const auth = createAuthStore();
export const isLoggedIn = derived(auth, ($auth) => $auth !== null);
export const userId = derived(auth, ($auth) => $auth?.user_id ?? null);
