// src/lib/stores/credits.ts
import { writable } from 'svelte/store';
import * as cmd from '$lib/utils/commands';

function createCreditsStore() {
  const { subscribe, set } = writable<number>(0);

  return {
    subscribe,
    async refresh(): Promise<void> {
      try {
        const result = await cmd.apiGetBalance();
        set(result.balance);
      } catch (err) {
        console.error('Failed to refresh credit balance:', err);
        // Leave existing balance in place
      }
    },
    setBalance(n: number): void {
      set(n);
    },
  };
}

export const credits = createCreditsStore();
