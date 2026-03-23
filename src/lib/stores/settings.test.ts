import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { settings } from './settings';

vi.mock('@tauri-apps/api/core');

describe('settings store', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('has correct defaults', () => {
    const s = get(settings);
    expect(s.output_size).toBe('1K');
    expect(s.aspect_ratio).toBe('16:9');
    expect(s.temperature).toBe(1);
  });

  it('loads saved settings from backend', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      default_output_size: '2K',
      default_aspect_ratio: '1:1',
      default_temperature: '0.5',
    });

    await settings.load();

    const s = get(settings);
    expect(s.output_size).toBe('2K');
    expect(s.aspect_ratio).toBe('1:1');
    expect(s.temperature).toBe(0.5);
  });

  it('falls back to defaults on load error', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('DB error'));

    await settings.load();

    const s = get(settings);
    expect(s.output_size).toBe('1K');
    expect(s.aspect_ratio).toBe('16:9');
    expect(s.temperature).toBe(1);
  });

  it('persists update to backend', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await settings.update({ output_size: '4K' });

    expect(invoke).toHaveBeenCalledWith('save_setting', {
      key: 'default_output_size',
      value: '4K',
    });
  });

  it('persists temperature as string', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await settings.update({ temperature: 1.5 });

    expect(invoke).toHaveBeenCalledWith('save_setting', {
      key: 'default_temperature',
      value: '1.5',
    });
  });

  it('resets to defaults and persists', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await settings.reset();

    const s = get(settings);
    expect(s.output_size).toBe('1K');
    expect(s.aspect_ratio).toBe('16:9');
    expect(s.temperature).toBe(1);

    expect(invoke).toHaveBeenCalledWith('save_setting', {
      key: 'default_output_size',
      value: '1K',
    });
  });
});
