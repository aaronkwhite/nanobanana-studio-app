// src/lib/stores/settings.ts
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { GenerationDefaults } from '$lib/types';

const STORAGE_KEY = 'nanobanana-settings';

const defaultSettings: GenerationDefaults = {
  output_size: '1K',
  aspect_ratio: '1:1',
  temperature: 1,
};

function loadSettings(): GenerationDefaults {
  if (!browser) return defaultSettings;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return defaultSettings;
  }
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<GenerationDefaults>(loadSettings());

  return {
    subscribe,
    update(partial: Partial<GenerationDefaults>) {
      update((current) => {
        const next = { ...current, ...partial };
        if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    reset() {
      set(defaultSettings);
      if (browser) localStorage.removeItem(STORAGE_KEY);
    },
  };
}

export const settings = createSettingsStore();
