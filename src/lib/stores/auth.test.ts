import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$lib/utils/commands', () => ({
  getAuthState: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  apiGetBalance: vi.fn(),
}));

import { auth, isLoggedIn, userId } from './auth';
import * as cmd from '$lib/utils/commands';

beforeEach(() => {
  vi.mocked(cmd.getAuthState).mockReset();
  vi.mocked(cmd.login).mockReset();
  vi.mocked(cmd.logout).mockReset();
  // Reset store state between tests
  auth.logout().catch(() => {});
});

describe('auth store', () => {
  it('starts unauthenticated', () => {
    expect(get(isLoggedIn)).toBe(false);
    expect(get(userId)).toBeNull();
  });

  it('load() returns null and stays unauthenticated when no stored token', async () => {
    vi.mocked(cmd.getAuthState).mockResolvedValue(null);
    const state = await auth.load();
    expect(state).toBeNull();
    expect(get(isLoggedIn)).toBe(false);
  });

  it('load() sets auth state when token exists', async () => {
    vi.mocked(cmd.getAuthState).mockResolvedValue({ token: 'tok', user_id: 'u1' });
    const state = await auth.load();
    expect(state).toEqual({ token: 'tok', user_id: 'u1' });
    expect(get(isLoggedIn)).toBe(true);
    expect(get(userId)).toBe('u1');
  });

  it('load() returns null when getAuthState throws', async () => {
    vi.mocked(cmd.getAuthState).mockRejectedValue(new Error('keychain error'));
    const state = await auth.load();
    expect(state).toBeNull();
    expect(get(isLoggedIn)).toBe(false);
  });

  it('login() sets auth state', async () => {
    vi.mocked(cmd.login).mockResolvedValue({ token: 'tok2', user_id: 'u2' });
    await auth.login('a@b.com', 'pass');
    expect(get(isLoggedIn)).toBe(true);
    expect(get(userId)).toBe('u2');
  });

  it('logout() clears auth state', async () => {
    vi.mocked(cmd.login).mockResolvedValue({ token: 'tok', user_id: 'u1' });
    vi.mocked(cmd.logout).mockResolvedValue(undefined);
    await auth.login('a@b.com', 'pass');
    await auth.logout();
    expect(get(isLoggedIn)).toBe(false);
    expect(get(userId)).toBeNull();
  });
});
