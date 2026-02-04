import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock Tauri invoke API
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';
import type { ConfigStatus } from './config';

describe('config store', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	describe('initial state', () => {
		it('should start with no API key', async () => {
			const { config } = await import('./config');

			const configStatus = get(config);
			expect(configStatus.has_key).toBe(false);
			expect(configStatus.masked).toBe(null);
		});
	});

	describe('load', () => {
		it('should load config from backend', async () => {
			const mockConfig: ConfigStatus = {
				has_key: true,
				masked: 'AI****xyz'
			};
			vi.mocked(invoke).mockResolvedValue(mockConfig);

			const { config } = await import('./config');
			const result = await config.load();

			expect(invoke).toHaveBeenCalledWith('get_config');
			expect(result).toEqual(mockConfig);
			expect(get(config)).toEqual(mockConfig);
		});

		it('should handle load errors gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.mocked(invoke).mockRejectedValue(new Error('Backend error'));

			const { config } = await import('./config');
			const result = await config.load();

			expect(consoleSpy).toHaveBeenCalledWith('Failed to load config:', expect.any(Error));
			expect(result).toEqual({ has_key: false, masked: null });
			consoleSpy.mockRestore();
		});
	});

	describe('save', () => {
		it('should save API key to backend', async () => {
			vi.mocked(invoke).mockResolvedValue({ has_key: true, masked: 'AI****xyz' });

			const { config } = await import('./config');
			await config.save('AIzaSyTestApiKey');

			expect(invoke).toHaveBeenCalledWith('save_config', { apiKey: 'AIzaSyTestApiKey' });
		});

		it('should reload config after saving', async () => {
			const mockConfigAfterSave: ConfigStatus = {
				has_key: true,
				masked: 'AI****key'
			};

			// First call is for save_config, second is for get_config in load()
			vi.mocked(invoke)
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(mockConfigAfterSave);

			const { config } = await import('./config');
			await config.save('AIzaSyNewApiKey');

			// Should call get_config to refresh state
			expect(invoke).toHaveBeenCalledWith('get_config');
			expect(get(config)).toEqual(mockConfigAfterSave);
		});
	});

	describe('remove', () => {
		it('should remove API key from backend', async () => {
			vi.mocked(invoke).mockResolvedValue(undefined);

			const { config } = await import('./config');
			await config.remove();

			expect(invoke).toHaveBeenCalledWith('delete_config');
		});

		it('should reset state after removing', async () => {
			// Set up initial state with a key
			vi.mocked(invoke).mockResolvedValue({ has_key: true, masked: 'AI****xyz' });

			const { config } = await import('./config');
			await config.load();

			expect(get(config).has_key).toBe(true);

			// Now remove
			vi.mocked(invoke).mockResolvedValue(undefined);
			await config.remove();

			const configStatus = get(config);
			expect(configStatus.has_key).toBe(false);
			expect(configStatus.masked).toBe(null);
		});
	});
});
