import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn()
}));

// Mock localStorage
const localStorageMock = {
	store: {} as Record<string, string>,
	getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
	setItem: vi.fn((key: string, value: string) => {
		localStorageMock.store[key] = value;
	}),
	removeItem: vi.fn((key: string) => {
		delete localStorageMock.store[key];
	}),
	clear: () => {
		localStorageMock.store = {};
		vi.clearAllMocks();
	}
};

Object.defineProperty(global, 'localStorage', {
	value: localStorageMock,
	writable: true
});

// Mock matchMedia
Object.defineProperty(global, 'matchMedia', {
	value: vi.fn(() => ({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	})),
	writable: true
});

// Mock navigator.clipboard
Object.defineProperty(global.navigator, 'clipboard', {
	value: {
		writeText: vi.fn().mockResolvedValue(undefined),
		readText: vi.fn().mockResolvedValue('')
	},
	writable: true
});

// Export for use in tests
export { localStorageMock };
