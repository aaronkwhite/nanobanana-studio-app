// src/lib/stores/settings.ts
import { writable } from 'svelte/store';
import type { GenerationDefaults } from '$lib/types';
import * as cmd from '$lib/utils/commands';

const defaultSettings: GenerationDefaults = {
  output_size: '1K',
  aspect_ratio: '16:9',
  temperature: 1,
};

function createSettingsStore() {
  const { subscribe, set, update } = writable<GenerationDefaults>(defaultSettings);

  return {
    subscribe,
    async load() {
      try {
        const all = await cmd.getAllSettings();
        const loaded: GenerationDefaults = {
          output_size: (all['default_output_size'] as any) ?? defaultSettings.output_size,
          aspect_ratio: (all['default_aspect_ratio'] as any) ?? defaultSettings.aspect_ratio,
          temperature: all['default_temperature']
            ? Number(all['default_temperature'])
            : defaultSettings.temperature,
        };
        set(loaded);
      } catch {
        set(defaultSettings);
      }
    },
    async update(partial: Partial<GenerationDefaults>) {
      // Persist first so the store only reflects values that made it to DB.
      // Callers can catch and show an error if persistence fails.
      const writes: Promise<void>[] = [];
      if (partial.output_size) writes.push(cmd.saveSetting('default_output_size', partial.output_size));
      if (partial.aspect_ratio) writes.push(cmd.saveSetting('default_aspect_ratio', partial.aspect_ratio));
      if (partial.temperature !== undefined)
        writes.push(cmd.saveSetting('default_temperature', String(partial.temperature)));
      await Promise.all(writes);
      update((current) => ({ ...current, ...partial }));
    },
    async reset() {
      set(defaultSettings);
      await cmd.saveSetting('default_output_size', defaultSettings.output_size);
      await cmd.saveSetting('default_aspect_ratio', defaultSettings.aspect_ratio);
      await cmd.saveSetting('default_temperature', String(defaultSettings.temperature));
    },
  };
}

export const settings = createSettingsStore();
