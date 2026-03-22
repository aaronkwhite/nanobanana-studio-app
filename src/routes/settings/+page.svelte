<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { ArrowLeft, Eye, EyeOff, Sun, Moon, Monitor, Key, RotateCcw, ExternalLink, Heart, Coffee } from 'lucide-svelte';
  import { open } from '@tauri-apps/plugin-shell';
  import { open as dialogOpen } from '@tauri-apps/plugin-dialog';
  import { getVersion } from '@tauri-apps/api/app';
  import * as cmd from '$lib/utils/commands';

  function openExternal(url: string) {
    open(url).catch(() => {
      window.open(url, '_blank');
    });
  }
  import { Button, Input, Select } from '$lib/components/ui';
  import { config } from '$lib/stores/config';
  import { theme } from '$lib/stores/theme';
  import { settings } from '$lib/stores/settings';
  import { OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES } from '$lib/types';
  import type { OutputSize, AspectRatio, Theme } from '$lib/types';

  let activeTab: string = $state('general');
  let apiKey: string = $state('');
  let showKey: boolean = $state(false);
  let saving: boolean = $state(false);
  let error: string = $state('');
  let success: string = $state('');
  let resultsDir: string = $state('');
  let defaultResultsDir: string = $state('');
  let appVersion: string = $state('');
  let settingsTabEls: HTMLButtonElement[] = [];
  let settingsPillEl: HTMLDivElement | undefined = $state();
  let settingsPillStyle = $state('');

  function updateSettingsPill() {
    const idx = tabs.findIndex(t => t.value === activeTab);
    const el = settingsTabEls[idx];
    if (el) {
      settingsPillStyle = `width: ${el.offsetWidth}px; transform: translateX(${el.offsetLeft - 2}px);`;
    }
  }

  $effect(() => {
    void activeTab;
    tick().then(updateSettingsPill);
  });

  async function loadDirectories() {
    resultsDir = (await cmd.getSetting('results_dir')) ?? '';
    defaultResultsDir = await cmd.getDefaultResultsDir();
  }

  const tabs = [
    { value: 'general', label: 'General' },
    { value: 'about', label: 'About' },
  ];

  const sizeOptions = Object.entries(OUTPUT_SIZES).map(([value, { label }]) => ({ value: value as OutputSize, label }));
  const ratioOptions = Object.entries(ASPECT_RATIOS).map(([value, label]) => ({ value: value as AspectRatio, label }));
  const tempOptions = TEMPERATURES.map((t) => ({ value: String(t), label: t === 0 ? 'Precise' : t === 2 ? 'Creative' : String(t) }));

  onMount(() => {
    config.load();
    settings.load();
    loadDirectories();
    getVersion().then(v => { appVersion = v; });
  });

  async function saveApiKey() {
    error = '';
    success = '';
    if (!apiKey.trim()) {
      error = 'API key is required';
      return;
    }
    saving = true;
    try {
      const valid = await config.validate(apiKey);
      if (!valid) {
        error = 'Invalid API key — could not authenticate with Gemini';
        return;
      }
      await config.save(apiKey);
      apiKey = '';
      success = 'API key validated and saved';
    } catch (err) {
      error = String(err);
    } finally {
      saving = false;
    }
  }

  async function removeApiKey() {
    await config.remove();
    success = '';
    error = '';
  }
</script>

<!-- Settings titlebar (draggable, spacer only) -->
<div
  data-tauri-drag-region
  class="sticky top-0 z-40 glass border-b border-[var(--glass-border)] titlebar"
>
  <div data-tauri-drag-region class="h-[52px]" style="padding-left: 86px;"></div>
</div>

<div class="px-6 py-6 flex flex-col gap-4">
  <!-- Back arrow + Settings title -->
  <div class="flex items-center gap-3">
    <a
      href="/"
      class="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-colors"
      aria-label="Back"
    >
      <ArrowLeft size={18} />
    </a>
    <h1 class="text-sm font-semibold text-[var(--text)]">Settings</h1>
  </div>

  <!-- Tab navigation -->
  <div class="settings-tabs flex relative rounded-[10px] p-[2px]">
    <div
      class="settings-pill absolute top-[2px] h-[calc(100%-4px)] rounded-[var(--radius-md)]"
      bind:this={settingsPillEl}
      style="transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1), width 250ms cubic-bezier(0.22, 1, 0.36, 1); {settingsPillStyle}"
    ></div>
    {#each tabs as tab, i}
      <button
        bind:this={settingsTabEls[i]}
        onclick={() => { activeTab = tab.value; }}
        class="relative z-[1] flex items-center gap-1.5 flex-1 justify-center rounded-[var(--radius-md)] px-3 py-[5px] text-xs cursor-pointer bg-transparent border-none font-sans tracking-tight transition-colors duration-200 {activeTab === tab.value ? 'font-medium text-[var(--text)]' : 'font-normal text-[var(--muted)] hover:text-[var(--text)]'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- General -->
  {#if activeTab === 'general'}
    <div class="flex flex-col gap-4">
      <!-- API Key -->
      <div class="glass p-5 flex flex-col gap-4 relative z-40">
        <div>
          <h2 class="text-sm font-semibold text-[var(--text)]">Gemini API Key</h2>
          <p class="text-xs text-[var(--muted)] mt-1">
            Required for image generation. Get yours from Google AI Studio.
          </p>
        </div>

        {#if $config.has_key}
          <div class="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] p-3">
            <Key size={16} class="text-[var(--success)] shrink-0" />
            <code class="flex-1 text-sm font-mono text-[var(--muted)] truncate">
              {$config.masked}
            </code>
            <Button variant="ghost" size="sm" onclick={removeApiKey}>Remove</Button>
          </div>
        {:else}
          <div class="flex flex-col gap-3">
            <div class="flex gap-2">
              <div class="flex-1 relative">
                <input
                  bind:value={apiKey}
                  type={showKey ? 'text' : 'password'}
                  placeholder="Paste your API key here"
                  class="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] pl-3 pr-9 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  onclick={() => { showKey = !showKey; }}
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {#if showKey}
                    <EyeOff size={15} />
                  {:else}
                    <Eye size={15} />
                  {/if}
                </button>
              </div>
              <Button onclick={saveApiKey} disabled={saving} size="md">
                {saving ? 'Validating...' : 'Test & Save'}
              </Button>
            </div>

            {#if error}
              <p class="text-xs text-[var(--error)]">{error}</p>
            {/if}
          </div>
        {/if}

        {#if success}
          <p class="text-xs text-[var(--success)]">{success}</p>
        {/if}

        <button
          onclick={() => openExternal('https://aistudio.google.com/apikey')}
          class="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          <ExternalLink size={12} />
          Get an API key from Google AI Studio
        </button>
      </div>

      <!-- Defaults -->
      <div class="glass p-5 flex flex-col gap-4 relative z-30">
        <div>
          <h2 class="text-sm font-semibold text-[var(--text)]">Generation Defaults</h2>
          <p class="text-xs text-[var(--muted)] mt-1">Pre-fill values for new generation jobs.</p>
        </div>

        <div class="flex flex-col gap-3">
          <Select
            label="Output Size"
            options={sizeOptions}
            value={$settings.output_size}
            onchange={(v) => settings.update({ output_size: v })}
          />
          <Select
            label="Aspect Ratio"
            options={ratioOptions}
            value={$settings.aspect_ratio}
            onchange={(v) => settings.update({ aspect_ratio: v })}
          />
          <Select
            label="Temperature"
            options={tempOptions}
            value={String($settings.temperature)}
            onchange={(v) => settings.update({ temperature: Number(v) })}
          />
        </div>

        <div class="border-t border-[var(--border)] pt-3">
          <Button variant="ghost" size="sm" onclick={() => settings.reset()}>
            <RotateCcw size={14} />
            Reset to defaults
          </Button>
        </div>
      </div>

      <!-- Storage -->
      <div class="glass p-5 flex flex-col gap-4 relative z-20">
        <div>
          <h2 class="text-sm font-semibold text-[var(--text)]">Output Directory</h2>
          <p class="text-xs text-[var(--muted)] mt-1">Where generated images are saved.</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex gap-2">
            <div class="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] truncate">
              {resultsDir || defaultResultsDir || '~/Pictures/Nana Studio'}
            </div>
            <Button variant="secondary" size="sm" onclick={async () => {
              const dir = await dialogOpen({ directory: true });
              if (dir) {
                resultsDir = dir;
                await cmd.saveSetting('results_dir', dir);
              }
            }}>Browse</Button>
            {#if resultsDir}
              <Button variant="ghost" size="sm" onclick={async () => {
                resultsDir = '';
                await cmd.saveSetting('results_dir', '');
              }}>Reset</Button>
            {/if}
          </div>
        </div>
      </div>

      <!-- Appearance -->
      <div class="glass p-5 flex flex-col gap-4 relative z-10">
        <div>
          <h2 class="text-sm font-semibold text-[var(--text)]">Theme</h2>
          <p class="text-xs text-[var(--muted)] mt-1">Choose your preferred appearance.</p>
        </div>

        <div class="grid grid-cols-3 gap-2">
          {#each [
            { value: 'light' as Theme, label: 'Light', icon: Sun, desc: 'Bright and clean' },
            { value: 'dark' as Theme, label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
            { value: 'system' as Theme, label: 'System', icon: Monitor, desc: 'Match your OS' },
          ] as opt}
            <button
              onclick={() => theme.set(opt.value)}
              class="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border p-4 transition-colors {$theme === opt.value ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted)]'}"
            >
              <svelte:component this={opt.icon} size={20} class={$theme === opt.value ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
              <span class="text-sm font-medium text-[var(--text)]">{opt.label}</span>
              <span class="text-xs text-[var(--muted)]">{opt.desc}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>

  <!-- About -->
  {:else if activeTab === 'about'}
    <div class="flex flex-col gap-4">
    <div class="glass p-5 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <img src="/images/nana-studio-mark.svg" alt="Nana Studio" class="h-10 w-10" />
        <div>
          <h2 class="text-sm font-semibold text-[var(--text)]">Nana Studio</h2>
          <p class="text-xs text-[var(--muted)]">Version {appVersion || '...'}</p>
        </div>
      </div>

      <p class="text-xs italic text-[var(--muted)] mb-1">Peel. Prompt. Produce.</p>
      <p class="text-sm text-[var(--text)] leading-relaxed">
        Nana Studio uses the Gemini Batch API to generate media in bulk. Instead of sending one prompt at a time, the Batch API lets you submit an entire set of prompts as a single job. Google processes them asynchronously and returns all the results when the batch is complete — at <strong class="font-semibold">50% of the standard per-request API cost</strong>.
      </p>
      <p class="text-sm text-[var(--text)] leading-relaxed">
        This means you can queue up dozens of prompts, close the app, and come back to finished results. No babysitting, no rate limits, half the price.
      </p>

      <div class="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--muted)]">Model</span>
          <span class="text-[var(--text)] font-mono">gemini-3.1-pro-preview</span>
        </div>
      </div>
    </div>

    <!-- Support -->
    <div class="glass p-5 flex flex-col gap-4">
      <div>
        <h2 class="text-sm font-semibold text-[var(--text)]">Support the Project</h2>
        <p class="text-xs text-[var(--muted)] mt-1">Enjoying Nana Studio? Consider buying me a coffee!</p>
      </div>

      <button
        onclick={() => openExternal('https://buymeacoffee.com/aaronkwhite')}
        class="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] group cursor-pointer"
      >
        <Coffee size={18} class="text-[var(--accent)] group-hover:text-[var(--accent-hover)]" />
        <span class="text-sm font-medium text-[var(--text)]">Buy Me a Coffee</span>
      </button>

      <p class="text-xs text-[var(--muted)] text-center">
        Made with <Heart size={10} class="inline text-[var(--accent)]" /> by Aaron K. White
      </p>
    </div>

    <!-- Legal -->
    <div class="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
      <h3 class="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">The Fine Print</h3>
      <p class="text-xs text-[var(--muted)] leading-relaxed">
        Nana Studio is an independent product created by Aaron K. White. It is not affiliated with, endorsed by, sponsored by, or in any way officially connected with Google LLC, Alphabet Inc., or any of their subsidiaries or affiliates.
      </p>
      <p class="text-xs text-[var(--muted)] leading-relaxed">
        Google, Gemini, and Google AI Studio are trademarks or registered trademarks of Google LLC. This application uses the Google Gemini API under Google's standard API Terms of Service. All generated content is subject to Google's usage policies.
      </p>
      <p class="text-xs text-[var(--muted)] leading-relaxed">
        Image generation results are produced by Google's Gemini model. The developer of this application makes no guarantees regarding output quality, availability, or content safety. Users are responsible for their use of generated content and compliance with applicable laws.
      </p>
    </div>
    </div>
  {/if}
</div>

<style>
  .titlebar {
    -webkit-app-region: drag;
  }
  .settings-tabs {
    background: rgba(128, 128, 128, 0.08);
    border: 0.5px solid rgba(128, 128, 128, 0.12);
  }
  .settings-pill {
    background: var(--surface);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.04);
  }
  :global([data-theme="dark"]) .settings-tabs {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
  }
  :global([data-theme="dark"]) .settings-pill {
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 0.5px rgba(255, 255, 255, 0.06);
  }
</style>
