import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { config } from './config';

vi.mock('@tauri-apps/api/core');

describe('config store', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Reset store state to initial values before each test
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    await config.remove();
    vi.resetAllMocks();
  });

  it('starts with no key', () => {
    const c = get(config);
    expect(c.has_key).toBe(false);
    expect(c.masked).toBeNull();
  });

  it('loads config with key from backend', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      has_key: true,
      masked: 'AI...xyz',
    });

    await config.load();

    const c = get(config);
    expect(c.has_key).toBe(true);
    expect(c.masked).toBe('AI...xyz');
  });

  it('validates API key via backend', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(true);

    const valid = await config.validate('test-key');

    expect(valid).toBe(true);
    expect(invoke).toHaveBeenCalledWith('validate_api_key', { apiKey: 'test-key' });
  });

  it('saves API key and reloads config', async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(undefined) // saveConfig
      .mockResolvedValueOnce({ has_key: true, masked: 'te...key' }); // getConfig reload

    await config.save('test-key');

    expect(invoke).toHaveBeenCalledWith('save_config', { apiKey: 'test-key' });
  });

  it('removes API key and clears state', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await config.remove();

    expect(invoke).toHaveBeenCalledWith('delete_config');
    const c = get(config);
    expect(c.has_key).toBe(false);
  });
});
