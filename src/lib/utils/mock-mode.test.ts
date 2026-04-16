import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

const STORAGE_KEY = 'nanobanana-mock-mode';

function mockEnv(opts: { browser: boolean; dev: boolean }) {
  vi.doMock('$app/environment', () => opts);
}

async function freshStore() {
  vi.resetModules();
  const mod = await import('./mock-mode');
  return mod.mockMode;
}

describe('mock-mode store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('$app/environment');
    localStorage.clear();
  });

  describe('in dev', () => {
    beforeEach(() => mockEnv({ browser: true, dev: true }));

    it('reads initial value from localStorage', async () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const s = await freshStore();
      expect(get(s)).toBe(true);
    });

    it('defaults to false when unset', async () => {
      const s = await freshStore();
      expect(get(s)).toBe(false);
    });

    it('toggle() flips state and persists', async () => {
      const s = await freshStore();
      s.toggle();
      expect(get(s)).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
      s.toggle();
      expect(get(s)).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('enable()/disable() set state', async () => {
      const s = await freshStore();
      s.enable();
      expect(get(s)).toBe(true);
      s.disable();
      expect(get(s)).toBe(false);
    });
  });

  describe('in production', () => {
    beforeEach(() => mockEnv({ browser: true, dev: false }));

    it('ignores a stale/spoofed localStorage value at init', async () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const s = await freshStore();
      expect(get(s)).toBe(false);
    });

    it('toggle() is a no-op', async () => {
      const s = await freshStore();
      s.toggle();
      expect(get(s)).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('enable() is a no-op', async () => {
      const s = await freshStore();
      s.enable();
      expect(get(s)).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('disable() is a no-op', async () => {
      const s = await freshStore();
      localStorage.setItem(STORAGE_KEY, 'true');
      s.disable();
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });
  });
});
