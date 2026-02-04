import { writable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

export interface ConfigStatus {
	has_key: boolean;
	masked: string | null;
}

function createConfigStore() {
	const { subscribe, set } = writable<ConfigStatus>({
		has_key: false,
		masked: null
	});

	return {
		subscribe,
		async load() {
			try {
				const config = await invoke<ConfigStatus>('get_config');
				set(config);
				return config;
			} catch (error) {
				console.error('Failed to load config:', error);
				return { has_key: false, masked: null };
			}
		},
		async save(apiKey: string) {
			await invoke('save_config', { apiKey });
			await this.load();
		},
		async remove() {
			await invoke('delete_config');
			set({ has_key: false, masked: null });
		}
	};
}

export const config = createConfigStore();
