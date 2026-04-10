import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$lib/utils/commands', () => ({
  getAuthState: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  apiGetBalance: vi.fn(),
}));

import { credits } from './credits';
import * as cmd from '$lib/utils/commands';

beforeEach(() => {
  vi.mocked(cmd.apiGetBalance).mockReset();
  credits.setBalance(0); // reset to initial state
});

describe('credits store', () => {
  it('starts at 0', () => {
    expect(get(credits)).toBe(0);
  });

  it('refresh() updates balance from API', async () => {
    vi.mocked(cmd.apiGetBalance).mockResolvedValue({ balance: 42 });
    await credits.refresh();
    expect(get(credits)).toBe(42);
  });

  it('refresh() leaves balance unchanged when API fails', async () => {
    credits.setBalance(10);
    vi.mocked(cmd.apiGetBalance).mockRejectedValue(new Error('network error'));
    await credits.refresh();
    expect(get(credits)).toBe(10);
  });

  it('setBalance() directly sets the balance', () => {
    credits.setBalance(99);
    expect(get(credits)).toBe(99);
  });
});
