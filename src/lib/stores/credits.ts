// src/lib/stores/credits.ts
import { writable } from 'svelte/store';
import * as cmd from '$lib/utils/commands';

function createCreditsStore() {
  const { subscribe, set } = writable<number>(0);

  return {
    subscribe,
    async refresh(): Promise<void> {
      const result = await cmd.apiGetBalance();
      set(result.balance);
    },
    set,
  };
}

export const credits = createCreditsStore();
