// src/lib/stores/settings.ts
import { writable } from 'svelte/store';
import type { GenerationDefaults, OutputSize, AspectRatio } from '$lib/types';
import { OUTPUT_SIZES, ASPECT_RATIOS } from '$lib/types';
import * as cmd from '$lib/utils/commands';

const defaultSettings: GenerationDefaults = {
  output_size: '1K',
  aspect_ratio: '16:9',
  temperature: 1,
};

function asOutputSize(v: string | undefined, fallback: OutputSize): OutputSize {
  return v && v in OUTPUT_SIZES ? (v as OutputSize) : fallback;
}

function asAspectRatio(v: string | undefined, fallback: AspectRatio): AspectRatio {
  return v && v in ASPECT_RATIOS ? (v as AspectRatio) : fallback;
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<GenerationDefaults>(defaultSettings);

  return {
    subscribe,
    async load() {
      try {
        const all = await cmd.getAllSettings();
        const loaded: GenerationDefaults = {
          output_size: asOutputSize(all['default_output_size'], defaultSettings.output_size),
          aspect_ratio: asAspectRatio(all['default_aspect_ratio'], defaultSettings.aspect_ratio),
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
