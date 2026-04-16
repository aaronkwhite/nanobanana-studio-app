// src/lib/utils/mock-mode.ts
import { writable, get } from 'svelte/store';
import { browser, dev } from '$app/environment';

const STORAGE_KEY = 'nanobanana-mock-mode';

function createMockModeStore() {
  // Mock mode only activates in dev. Production ignores any stored flag
  // and no-ops the mutators so a stale/spoofed localStorage value
  // cannot surface fake jobs to a paying user.
  const initial = browser && dev ? localStorage.getItem(STORAGE_KEY) === 'true' : false;
  const { subscribe, set } = writable<boolean>(initial);

  return {
    subscribe,
    toggle() {
      if (!dev) return;
      const current = get({ subscribe });
      const next = !current;
      if (browser) localStorage.setItem(STORAGE_KEY, String(next));
      set(next);
    },
    enable() {
      if (!dev) return;
      if (browser) localStorage.setItem(STORAGE_KEY, 'true');
      set(true);
    },
    disable() {
      if (!dev) return;
      if (browser) localStorage.setItem(STORAGE_KEY, 'false');
      set(false);
    },
  };
}

export const mockMode = createMockModeStore();
