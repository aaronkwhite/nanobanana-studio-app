// src/lib/utils/mock-mode.ts
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'nanobanana-mock-mode';

function createMockModeStore() {
  const initial = browser ? localStorage.getItem(STORAGE_KEY) === 'true' : false;
  const { subscribe, set } = writable<boolean>(initial);

  return {
    subscribe,
    toggle() {
      const current = get({ subscribe });
      const next = !current;
      if (browser) localStorage.setItem(STORAGE_KEY, String(next));
      set(next);
    },
    enable() {
      if (browser) localStorage.setItem(STORAGE_KEY, 'true');
      set(true);
    },
    disable() {
      if (browser) localStorage.setItem(STORAGE_KEY, 'false');
      set(false);
    },
  };
}

export const mockMode = createMockModeStore();
