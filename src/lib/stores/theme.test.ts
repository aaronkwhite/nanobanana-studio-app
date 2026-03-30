// src/lib/stores/theme.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { localStorageMock } from '../../tests/setup';

describe('theme store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to system theme', async () => {
    const { theme } = await import('./theme');
    expect(get(theme)).toBe('system');
  });

  it('persists theme to localStorage', async () => {
    const { theme } = await import('./theme');
    theme.set('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('nanobanana-theme', 'dark');
  });

  it('applies data-theme attribute', async () => {
    const { theme } = await import('./theme');
    theme.set('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
