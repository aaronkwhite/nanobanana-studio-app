// src/lib/stores/theme.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Theme } from '$lib/types';

function getInitialTheme(): Theme {
  if (!browser) return 'system';
  return (localStorage.getItem('nanobanana-theme') as Theme) ?? 'system';
}

function applyTheme(value: Theme) {
  if (!browser) return;
  const isDark =
    value === 'dark' ||
    (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

function createThemeStore() {
  const { subscribe, set: _set, update } = writable<Theme>(getInitialTheme());

  if (browser) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      update((current) => {
        if (current === 'system') applyTheme('system');
        return current;
      });
    });
  }

  return {
    subscribe,
    set(value: Theme) {
      if (browser) localStorage.setItem('nanobanana-theme', value);
      applyTheme(value);
      _set(value);
    },
    toggle() {
      update((current) => {
        const next: Theme =
          current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        if (browser) localStorage.setItem('nanobanana-theme', next);
        applyTheme(next);
        return next;
      });
    },
  };
}

export const theme = createThemeStore();
