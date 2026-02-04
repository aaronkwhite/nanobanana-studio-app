import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { localStorageMock } from '../../tests/setup';

// Mock document for theme application
Object.defineProperty(global, 'document', {
	value: {
		documentElement: {
			classList: {
				add: vi.fn(),
				remove: vi.fn()
			}
		}
	},
	writable: true
});

describe('theme store', () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.resetModules();
	});

	it('should default to system theme', async () => {
		const { theme } = await import('./theme');
		expect(get(theme)).toBe('system');
	});

	it('should toggle through themes: light -> dark -> system -> light', async () => {
		const { theme } = await import('./theme');

		theme.set('light');
		expect(get(theme)).toBe('light');

		theme.toggle();
		expect(get(theme)).toBe('dark');

		theme.toggle();
		expect(get(theme)).toBe('system');

		theme.toggle();
		expect(get(theme)).toBe('light');
	});

	it('should persist theme to localStorage', async () => {
		const { theme } = await import('./theme');

		theme.set('dark');
		expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
	});
});
