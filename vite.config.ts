import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Tauri expects a fixed port
	server: {
		port: 5173,
		strictPort: true,
	},
	// Clear screen on rebuild
	clearScreen: false,
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/tests/setup.ts'],
	},
	// Force browser conditions for all resolution
	resolve: {
		conditions: ['browser']
	}
});
