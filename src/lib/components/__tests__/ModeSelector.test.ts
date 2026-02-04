import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import ModeSelector from '../ModeSelector.svelte';

describe('ModeSelector component', () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('should render both mode buttons', () => {
		const onchange = vi.fn();
		render(ModeSelector, {
			props: {
				mode: 'text-to-image',
				onchange
			}
		});

		expect(screen.getByText(/Text to Image/)).toBeInTheDocument();
		expect(screen.getByText(/Image to Image/)).toBeInTheDocument();
	});

	it('should highlight text-to-image when selected', () => {
		const onchange = vi.fn();
		render(ModeSelector, {
			props: {
				mode: 'text-to-image',
				onchange
			}
		});

		const textToImageButton = screen.getByText(/Text to Image/).closest('button');
		expect(textToImageButton).toHaveClass('bg-white');
	});

	it('should highlight image-to-image when selected', () => {
		const onchange = vi.fn();
		render(ModeSelector, {
			props: {
				mode: 'image-to-image',
				onchange
			}
		});

		const imageToImageButton = screen.getByText(/Image to Image/).closest('button');
		expect(imageToImageButton).toHaveClass('bg-white');
	});

	it('should call onchange with text-to-image when clicked', async () => {
		const onchange = vi.fn();
		render(ModeSelector, {
			props: {
				mode: 'image-to-image',
				onchange
			}
		});

		const textToImageButton = screen.getByText(/Text to Image/);
		await fireEvent.click(textToImageButton);

		expect(onchange).toHaveBeenCalledWith('text-to-image');
	});

	it('should call onchange with image-to-image when clicked', async () => {
		const onchange = vi.fn();
		render(ModeSelector, {
			props: {
				mode: 'text-to-image',
				onchange
			}
		});

		const imageToImageButton = screen.getByText(/Image to Image/);
		await fireEvent.click(imageToImageButton);

		expect(onchange).toHaveBeenCalledWith('image-to-image');
	});

	it('should show emoji icons for each mode', () => {
		const onchange = vi.fn();
		render(ModeSelector, {
			props: {
				mode: 'text-to-image',
				onchange
			}
		});

		// Check for pencil and image emojis
		expect(screen.getByText(/✏️/)).toBeInTheDocument();
		expect(screen.getByText(/🖼️/)).toBeInTheDocument();
	});
});
