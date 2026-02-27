import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

// Import stores and component at module level (no dynamic imports)
import TextToImageForm from '../TextToImageForm.svelte';
import { config } from '$lib/stores/config';
import { jobs } from '$lib/stores/jobs';

describe('TextToImageForm component', () => {
	beforeEach(async () => {
		cleanup();
		vi.clearAllMocks();
		// Setup config with API key
		vi.mocked(invoke).mockResolvedValue({ has_key: true, masked: 'AI****xyz' });
		await config.load();
		// Clear jobs
		const currentJobs = get(jobs);
		currentJobs.forEach(job => jobs.removeJob(job.id));
	});

	afterEach(() => {
		// Clean up jobs after each test
		const currentJobs = get(jobs);
		currentJobs.forEach(job => jobs.removeJob(job.id));
	});

	it('should render the form with textarea', () => {
		render(TextToImageForm);
		expect(screen.getByPlaceholderText(/Enter a prompt/)).toBeInTheDocument();
	});

	it('should render size, aspect ratio, and creativity selects', () => {
		render(TextToImageForm);

		expect(screen.getByText('Size')).toBeInTheDocument();
		expect(screen.getByText('Aspect Ratio')).toBeInTheDocument();
		expect(screen.getByText('Creativity')).toBeInTheDocument();
	});

	it('should show generate button', () => {
		render(TextToImageForm);
		expect(screen.getByRole('button', { name: /Generate/ })).toBeInTheDocument();
	});

	it('should show output size options', () => {
		render(TextToImageForm);
		// Check for size options
		expect(screen.getByText('1K ($0.0335)')).toBeInTheDocument();
	});

	it('should update prompt count and cost when entering prompts', async () => {
		render(TextToImageForm);

		const textarea = screen.getByPlaceholderText(/Enter a prompt/);
		await fireEvent.input(textarea, { target: { value: 'A sunset over mountains' } });

		// Should show 1 image count and cost (look for the specific format in the span)
		expect(screen.getByText(/1 image · ~\$0\.03/)).toBeInTheDocument();
	});

	it('should queue prompts when pressing Enter', async () => {
		render(TextToImageForm);

		const textarea = screen.getByPlaceholderText(/Enter a prompt/);

		// Enter first prompt
		await fireEvent.input(textarea, { target: { value: 'First prompt' } });
		await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

		// Check for prompt queue label
		expect(screen.getByText('Prompt Queue')).toBeInTheDocument();
		expect(screen.getByText('First prompt')).toBeInTheDocument();
	});

	it('should remove queued prompts when clicking remove button', async () => {
		render(TextToImageForm);

		const textarea = screen.getByPlaceholderText(/Enter a prompt/);

		// Queue a prompt
		await fireEvent.input(textarea, { target: { value: 'Test prompt' } });
		await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

		expect(screen.getByText('Test prompt')).toBeInTheDocument();

		// Remove it
		const removeButton = screen.getByText('×');
		await fireEvent.click(removeButton);

		expect(screen.queryByText('Test prompt')).not.toBeInTheDocument();
	});

	it('should disable generate button when no prompts', () => {
		render(TextToImageForm);

		const generateButton = screen.getByRole('button', { name: /Generate/ });
		expect(generateButton).toBeDisabled();
	});

	it('should enable generate button when prompt is entered', async () => {
		render(TextToImageForm);

		const textarea = screen.getByPlaceholderText(/Enter a prompt/);
		await fireEvent.input(textarea, { target: { value: 'Test prompt' } });

		const generateButton = screen.getByRole('button', { name: /Generate/ });
		expect(generateButton).not.toBeDisabled();
	});

	it('should show API Key Required when no API key', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: false, masked: null });
		await config.load();

		render(TextToImageForm);

		const textarea = screen.getByPlaceholderText(/Enter a prompt/);
		await fireEvent.input(textarea, { target: { value: 'Test prompt' } });

		expect(screen.getByRole('button', { name: /API Key Required/ })).toBeInTheDocument();
	});

	it('should submit job when clicking generate', async () => {
		const mockJobResponse = {
			job: {
				id: 'new-job-1',
				status: 'pending',
				mode: 'text-to-image',
				prompt: 'Test prompt',
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
			},
			items: []
		};

		vi.mocked(invoke).mockResolvedValueOnce(mockJobResponse);

		render(TextToImageForm);

		const textarea = screen.getByPlaceholderText(/Enter a prompt/);
		await fireEvent.input(textarea, { target: { value: 'Test prompt' } });

		const generateButton = screen.getByRole('button', { name: /Generate/ });
		await fireEvent.click(generateButton);

		expect(invoke).toHaveBeenCalledWith('create_t2i_job', {
			request: {
				prompts: ['Test prompt'],
				output_size: '1K',
				temperature: 1,
				aspect_ratio: '1:1'
			}
		});
	});

	it('should calculate cost based on size and count', async () => {
		render(TextToImageForm);

		const textarea = screen.getByPlaceholderText(/Enter a prompt/);

		// Add multiple prompts
		await fireEvent.input(textarea, { target: { value: 'Prompt 1' } });
		await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
		await fireEvent.input(textarea, { target: { value: 'Prompt 2' } });

		// Should show 2 images (look for the specific format in the span)
		expect(screen.getByText(/2 images · ~\$0\.07/)).toBeInTheDocument();
	});
});
