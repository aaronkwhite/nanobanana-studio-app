// src/lib/stores/config.ts
import { writable } from 'svelte/store';
import type { ConfigStatus } from '$lib/types';
import * as cmd from '$lib/utils/commands';

function createConfigStore() {
  const { subscribe, set } = writable<ConfigStatus>({ has_key: false, masked: null });

  return {
    subscribe,
    async load() {
      const status = await cmd.getConfig();
      set(status);
      return status;
    },
    async save(apiKey: string) {
      await cmd.saveConfig(apiKey);
      await this.load();
    },
    async remove() {
      await cmd.deleteConfig();
      set({ has_key: false, masked: null });
    },
    async validate(apiKey: string): Promise<boolean> {
      return cmd.validateApiKey(apiKey);
    },
  };
}

export const config = createConfigStore();
