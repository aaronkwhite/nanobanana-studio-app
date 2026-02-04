import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

// Import stores and component at module level (no dynamic imports)
import Header from '../Header.svelte';
import { theme } from '$lib/stores/theme';
import { config } from '$lib/stores/config';
import { jobs, type Job } from '$lib/stores/jobs';

const mockJob: Job = {
	id: 'job-1',
	status: 'processing',
	mode: 'text-to-image',
	prompt: 'Test',
	output_size: '1K',
	temperature: 1,
	aspect_ratio: '1:1',
	batch_job_name: null,
	batch_temp_file: null,
	total_items: 1,
	completed_items: 0,
	failed_items: 0,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

describe('Header component', () => {
	beforeEach(async () => {
		cleanup();
		vi.clearAllMocks();
		// Reset stores to initial state
		vi.mocked(invoke).mockResolvedValue({ has_key: false, masked: null });
		await config.load();
	});

	it('should render the app title', () => {
		render(Header);
		expect(screen.getByText('Nanobanana Studio')).toBeInTheDocument();
	});

	it('should show banana emoji', () => {
		render(Header);
		expect(screen.getByText('🍌')).toBeInTheDocument();
	});

	it('should show theme toggle button', () => {
		render(Header);
		const themeButton = screen.getByTitle(/Toggle theme/);
		expect(themeButton).toBeInTheDocument();
	});

	it('should show settings button', () => {
		render(Header);
		const settingsButton = screen.getByTitle('Settings');
		expect(settingsButton).toBeInTheDocument();
	});

	it('should toggle theme when theme button is clicked', async () => {
		// Start with light theme
		theme.set('light');

		render(Header);

		const themeButton = screen.getByTitle(/Toggle theme/);
		await fireEvent.click(themeButton);

		// Should now be dark
		expect(get(theme)).toBe('dark');
	});

	it('should show API key warning when no key is configured', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: false, masked: null });
		await config.load();

		render(Header);
		expect(screen.getByText(/API key required/)).toBeInTheDocument();
	});

	it('should not show API key warning when key is configured', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: true, masked: 'AI****xyz' });
		await config.load();

		render(Header);
		expect(screen.queryByText(/API key required/)).not.toBeInTheDocument();
	});

	it('should show active jobs count when there are active jobs', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: true, masked: 'AI****xyz' });
		await config.load();

		// Add an active job
		jobs.addJob(mockJob);

		render(Header);
		expect(screen.getByText('1 active')).toBeInTheDocument();

		// Clean up
		jobs.removeJob(mockJob.id);
	});
});
