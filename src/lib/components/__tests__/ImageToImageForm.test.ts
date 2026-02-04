import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

// Import stores and component at module level (no dynamic imports)
import ImageToImageForm from '../ImageToImageForm.svelte';
import { config } from '$lib/stores/config';
import { jobs } from '$lib/stores/jobs';

describe('ImageToImageForm component', () => {
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

	it('should render the drop zone', () => {
		render(ImageToImageForm);

		expect(screen.getByText(/Drop images here/)).toBeInTheDocument();
		expect(screen.getByText(/browse/)).toBeInTheDocument();
	});

	it('should render the prompt textarea', () => {
		render(ImageToImageForm);
		expect(screen.getByPlaceholderText(/Describe the transformation/)).toBeInTheDocument();
	});

	it('should show file type restrictions', () => {
		render(ImageToImageForm);

		expect(screen.getByText(/JPEG, PNG, WebP, GIF/)).toBeInTheDocument();
		expect(screen.getByText(/Max 20 files/)).toBeInTheDocument();
	});

	it('should render size, aspect ratio, and creativity selects', () => {
		render(ImageToImageForm);

		expect(screen.getByText('Size')).toBeInTheDocument();
		expect(screen.getByText('Aspect Ratio')).toBeInTheDocument();
		expect(screen.getByText('Creativity')).toBeInTheDocument();
	});

	it('should show transform button', () => {
		render(ImageToImageForm);
		expect(screen.getByRole('button', { name: /Transform/ })).toBeInTheDocument();
	});

	it('should disable transform button when no files selected', () => {
		render(ImageToImageForm);

		const transformButton = screen.getByRole('button', { name: /Transform/ });
		expect(transformButton).toBeDisabled();
	});

	it('should open file picker when clicking drop zone', async () => {
		vi.mocked(open).mockResolvedValue(null);

		render(ImageToImageForm);

		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		expect(dropZone).toBeInTheDocument();
		await fireEvent.click(dropZone!);

		expect(open).toHaveBeenCalledWith({
			multiple: true,
			filters: [
				{
					name: 'Images',
					extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']
				}
			]
		});
	});

	it('should upload files when selected', async () => {
		const mockUploadedFiles = [
			{ id: 'file-1', path: '/path/to/image1.jpg', name: 'image1.jpg' },
			{ id: 'file-2', path: '/path/to/image2.png', name: 'image2.png' }
		];

		vi.mocked(open).mockResolvedValue(['/path/to/image1.jpg', '/path/to/image2.png']);
		vi.mocked(invoke).mockResolvedValueOnce(mockUploadedFiles);

		render(ImageToImageForm);

		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		await fireEvent.click(dropZone!);

		// Wait for async upload
		await vi.waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('upload_images', {
				files: ['/path/to/image1.jpg', '/path/to/image2.png']
			});
		});
	});

	it('should display uploaded files', async () => {
		const mockUploadedFiles = [
			{ id: 'file-1', path: '/path/to/image1.jpg', name: 'image1.jpg' }
		];

		vi.mocked(open).mockResolvedValue(['/path/to/image1.jpg']);
		vi.mocked(invoke).mockResolvedValueOnce(mockUploadedFiles);

		render(ImageToImageForm);

		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		await fireEvent.click(dropZone!);

		await vi.waitFor(() => {
			expect(screen.getByText('image1.jpg')).toBeInTheDocument();
		});
	});

	it('should show API Key Required when no API key', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: false, masked: null });
		await config.load();

		render(ImageToImageForm);

		expect(screen.getByRole('button', { name: /API Key Required/ })).toBeInTheDocument();
	});

	it('should submit job when clicking transform with files and prompt', async () => {
		const mockUploadedFiles = [
			{ id: 'file-1', path: '/path/to/image1.jpg', name: 'image1.jpg' }
		];

		const mockJobResponse = {
			job: {
				id: 'new-job-1',
				status: 'pending',
				mode: 'image-to-image',
				prompt: 'Make it watercolor style',
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

		vi.mocked(open).mockResolvedValue(['/path/to/image1.jpg']);
		vi.mocked(invoke)
			.mockResolvedValueOnce(mockUploadedFiles)
			.mockResolvedValueOnce(mockJobResponse);

		render(ImageToImageForm);

		// Select files
		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		await fireEvent.click(dropZone!);

		await vi.waitFor(() => {
			expect(screen.getByText('image1.jpg')).toBeInTheDocument();
		});

		// Enter prompt
		const textarea = screen.getByPlaceholderText(/Describe the transformation/);
		await fireEvent.input(textarea, { target: { value: 'Make it watercolor style' } });

		// Submit
		const transformButton = screen.getByRole('button', { name: /Transform/ });
		await fireEvent.click(transformButton);

		expect(invoke).toHaveBeenCalledWith('create_i2i_job', {
			request: {
				prompt: 'Make it watercolor style',
				image_paths: ['/path/to/image1.jpg'],
				output_size: '1K',
				temperature: 1,
				aspect_ratio: '1:1'
			}
		});
	});

	it('should show correct image count and cost', async () => {
		const mockUploadedFiles = [
			{ id: 'file-1', path: '/path/to/image1.jpg', name: 'image1.jpg' },
			{ id: 'file-2', path: '/path/to/image2.jpg', name: 'image2.jpg' }
		];

		vi.mocked(open).mockResolvedValue(['/path/to/image1.jpg', '/path/to/image2.jpg']);
		vi.mocked(invoke).mockResolvedValueOnce(mockUploadedFiles);

		render(ImageToImageForm);

		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		await fireEvent.click(dropZone!);

		await vi.waitFor(() => {
			// Look for the specific format in the span
			expect(screen.getByText(/2 images · ~\$0\.04/)).toBeInTheDocument();
		});
	});

	it('should remove file when clicking remove button', async () => {
		const mockUploadedFiles = [
			{ id: 'file-1', path: '/path/to/image1.jpg', name: 'image1.jpg' }
		];

		vi.mocked(open).mockResolvedValue(['/path/to/image1.jpg']);
		vi.mocked(invoke).mockResolvedValueOnce(mockUploadedFiles);

		render(ImageToImageForm);

		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		await fireEvent.click(dropZone!);

		await vi.waitFor(() => {
			expect(screen.getByText('image1.jpg')).toBeInTheDocument();
		});

		// Remove the file
		const removeButton = screen.getByText('×');
		await fireEvent.click(removeButton);

		expect(screen.queryByText('image1.jpg')).not.toBeInTheDocument();
	});

	it('should show dragging state on drag over', async () => {
		render(ImageToImageForm);

		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		expect(dropZone).toBeInTheDocument();

		await fireEvent.dragOver(dropZone!);

		// Check that dragging class is applied (border color changes)
		expect(dropZone).toHaveClass('border-banana-500');
	});

	it('should remove dragging state on drag leave', async () => {
		render(ImageToImageForm);

		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');

		await fireEvent.dragOver(dropZone!);
		expect(dropZone).toHaveClass('border-banana-500');

		await fireEvent.dragLeave(dropZone!);
		expect(dropZone).not.toHaveClass('border-banana-500');
	});

	it('should trigger file picker on drop', async () => {
		vi.mocked(open).mockResolvedValue(null);

		render(ImageToImageForm);

		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');

		// Simulate drop event without DataTransfer (not available in jsdom)
		await fireEvent.drop(dropZone!, {});

		// Drop triggers file picker in Tauri
		expect(open).toHaveBeenCalled();
	});

	it('should trigger file picker on Enter key', async () => {
		vi.mocked(open).mockResolvedValue(null);

		render(ImageToImageForm);

		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		await fireEvent.keyDown(dropZone!, { key: 'Enter' });

		expect(open).toHaveBeenCalled();
	});

	it('should handle error during job submission', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const mockUploadedFiles = [
			{ id: 'file-1', path: '/path/to/image1.jpg', name: 'image1.jpg' }
		];

		vi.mocked(open).mockResolvedValue(['/path/to/image1.jpg']);
		vi.mocked(invoke)
			.mockResolvedValueOnce(mockUploadedFiles)
			.mockRejectedValueOnce(new Error('Server error'));

		render(ImageToImageForm);

		// Select files
		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		await fireEvent.click(dropZone!);

		await vi.waitFor(() => {
			expect(screen.getByText('image1.jpg')).toBeInTheDocument();
		});

		// Enter prompt
		const textarea = screen.getByPlaceholderText(/Describe the transformation/);
		await fireEvent.input(textarea, { target: { value: 'Transform this' } });

		// Submit
		const transformButton = screen.getByRole('button', { name: /Transform/ });
		await fireEvent.click(transformButton);

		await vi.waitFor(() => {
			expect(consoleSpy).toHaveBeenCalledWith('Failed to create job:', expect.any(Error));
		});

		consoleSpy.mockRestore();
	});

	it('should not submit when files selected but no prompt', async () => {
		const mockUploadedFiles = [
			{ id: 'file-1', path: '/path/to/image1.jpg', name: 'image1.jpg' }
		];

		vi.mocked(open).mockResolvedValue(['/path/to/image1.jpg']);
		vi.mocked(invoke).mockResolvedValueOnce(mockUploadedFiles);

		render(ImageToImageForm);

		// Select files
		const dropZone = screen.getByText(/Drop images here/).closest('[role="button"]');
		await fireEvent.click(dropZone!);

		await vi.waitFor(() => {
			expect(screen.getByText('image1.jpg')).toBeInTheDocument();
		});

		// Don't enter prompt, button should still be disabled
		const transformButton = screen.getByRole('button', { name: /Transform/ });
		expect(transformButton).toBeDisabled();
	});
});
