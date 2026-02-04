import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { invoke } from '@tauri-apps/api/core';

import Page from '../+page.svelte';

describe('+page.svelte', () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		localStorage.clear();

		// Mock config and jobs endpoints
		vi.mocked(invoke).mockImplementation((cmd: string) => {
			if (cmd === 'get_config') {
				return Promise.resolve({ has_key: true, masked: 'AI****xyz' });
			}
			if (cmd === 'get_jobs') {
				return Promise.resolve([]);
			}
			return Promise.resolve(null);
		});
	});

	it('should render the page with header', () => {
		render(Page);

		expect(screen.getByText('Nanobanana Studio')).toBeInTheDocument();
	});

	it('should render mode selector buttons', () => {
		render(Page);

		// Mode selector has emoji + text
		expect(screen.getByText(/Text to Image/)).toBeInTheDocument();
		expect(screen.getByText(/Image to Image/)).toBeInTheDocument();
	});

	it('should render text-to-image form by default', () => {
		render(Page);

		// TextToImageForm has a specific placeholder
		expect(screen.getByPlaceholderText(/Enter a prompt/)).toBeInTheDocument();
	});

	it('should switch to image-to-image form when mode changes', async () => {
		render(Page);

		const i2iButton = screen.getByText(/Image to Image/);
		await fireEvent.click(i2iButton);

		// ImageToImageForm has drop zone text
		expect(screen.getByText(/Drop images here/)).toBeInTheDocument();
	});

	it('should render Recent Jobs section', () => {
		render(Page);

		expect(screen.getByText('Recent Jobs')).toBeInTheDocument();
	});

	it('should load config on mount', async () => {
		render(Page);

		await vi.waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('get_config');
		});
	});

	it('should load jobs on mount', async () => {
		render(Page);

		await vi.waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('get_jobs');
		});
	});
});
