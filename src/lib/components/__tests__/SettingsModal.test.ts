import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { invoke } from '@tauri-apps/api/core';

// Import stores and component at module level (no dynamic imports)
import SettingsModal from '../SettingsModal.svelte';
import { config } from '$lib/stores/config';

describe('SettingsModal component', () => {
	beforeEach(async () => {
		cleanup();
		vi.clearAllMocks();
		// Reset config state
		vi.mocked(invoke).mockResolvedValue({ has_key: false, masked: null });
		await config.load();
	});

	it('should not render when closed', () => {
		render(SettingsModal, {
			props: {
				open: false,
				onclose: vi.fn()
			}
		});

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('should render when open', () => {
		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('should show three tabs: API Key, About, Support', () => {
		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		expect(screen.getByRole('button', { name: 'API Key' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'About' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Support' })).toBeInTheDocument();
	});

	it('should show API Key tab by default', () => {
		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		expect(screen.getByText('Google Gemini API Key')).toBeInTheDocument();
	});

	it('should show API key input when no key is configured', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: false, masked: null });
		await config.load();

		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		expect(screen.getByPlaceholderText('AIza...')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Save API Key' })).toBeInTheDocument();
	});

	it('should show masked key and remove button when key is configured', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: true, masked: 'AI****xyz' });
		await config.load();

		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		expect(screen.getByText('AI****xyz')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
	});

	it('should switch to About tab when clicked', async () => {
		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const aboutTab = screen.getByRole('button', { name: 'About' });
		await fireEvent.click(aboutTab);

		expect(screen.getByText('Nanobanana Studio')).toBeInTheDocument();
		expect(screen.getByText('Batch image generation powered by Google Gemini')).toBeInTheDocument();
		expect(screen.getByText('Version 0.1.0')).toBeInTheDocument();
	});

	it('should switch to Support tab when clicked', async () => {
		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const supportTab = screen.getByRole('button', { name: 'Support' });
		await fireEvent.click(supportTab);

		expect(screen.getByText('Enjoying Nanobanana Studio?')).toBeInTheDocument();
		expect(screen.getByText('Buy Me a Coffee')).toBeInTheDocument();
	});

	it('should call onclose when close button is clicked', async () => {
		const onclose = vi.fn();
		render(SettingsModal, {
			props: {
				open: true,
				onclose
			}
		});

		const closeButton = screen.getByRole('button', { name: 'Close' });
		await fireEvent.click(closeButton);

		expect(onclose).toHaveBeenCalled();
	});

	it('should call onclose when clicking backdrop', async () => {
		const onclose = vi.fn();
		render(SettingsModal, {
			props: {
				open: true,
				onclose
			}
		});

		const backdrop = screen.getByRole('dialog');
		await fireEvent.click(backdrop);

		expect(onclose).toHaveBeenCalled();
	});

	it('should call onclose when pressing Escape', async () => {
		const onclose = vi.fn();
		render(SettingsModal, {
			props: {
				open: true,
				onclose
			}
		});

		const backdrop = screen.getByRole('dialog');
		await fireEvent.keyDown(backdrop, { key: 'Escape' });

		expect(onclose).toHaveBeenCalled();
	});

	it('should validate API key starts with AI', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: false, masked: null });
		await config.load();

		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const input = screen.getByPlaceholderText('AIza...');
		await fireEvent.input(input, { target: { value: 'invalid-key' } });

		const saveButton = screen.getByRole('button', { name: 'Save API Key' });
		await fireEvent.click(saveButton);

		expect(screen.getByText("API key must start with 'AI'")).toBeInTheDocument();
	});

	it('should save valid API key', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce({ has_key: false, masked: null }) // initial load
			.mockResolvedValueOnce(undefined) // save_config
			.mockResolvedValueOnce({ has_key: true, masked: 'AI****key' }); // get_config after save

		await config.load();

		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const input = screen.getByPlaceholderText('AIza...');
		await fireEvent.input(input, { target: { value: 'AIzaSyTestKey' } });

		const saveButton = screen.getByRole('button', { name: 'Save API Key' });
		await fireEvent.click(saveButton);

		expect(invoke).toHaveBeenCalledWith('save_config', { apiKey: 'AIzaSyTestKey' });
	});

	it('should remove API key when remove button is clicked', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: true, masked: 'AI****xyz' });
		await config.load();

		vi.mocked(invoke).mockResolvedValue(undefined);

		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const removeButton = screen.getByRole('button', { name: 'Remove' });
		await fireEvent.click(removeButton);

		expect(invoke).toHaveBeenCalledWith('delete_config');
	});

	it('should toggle password visibility', async () => {
		vi.mocked(invoke).mockResolvedValue({ has_key: false, masked: null });
		await config.load();

		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const input = screen.getByPlaceholderText('AIza...');
		expect(input).toHaveAttribute('type', 'password');

		// Toggle visibility - find the button with the eye emoji
		const toggleButton = screen.getByText('👁️');
		await fireEvent.click(toggleButton);

		expect(input).toHaveAttribute('type', 'text');
	});

	it('should link to Google AI Studio', () => {
		render(SettingsModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const link = screen.getByText('Google AI Studio');
		expect(link).toHaveAttribute('href', 'https://makersuite.google.com/app/apikey');
		expect(link).toHaveAttribute('target', '_blank');
	});
});
