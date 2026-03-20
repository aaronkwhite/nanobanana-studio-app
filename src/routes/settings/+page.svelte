<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, Eye, EyeOff, Sun, Moon, Monitor, Key, Palette, SlidersHorizontal, Info, RotateCcw, ExternalLink, Heart, Coffee } from 'lucide-svelte';
  import { open } from '@tauri-apps/plugin-shell';

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

  let activeTab: string = $state('api-key');
  let apiKey: string = $state('');
  let showKey: boolean = $state(false);
  let saving: boolean = $state(false);
  let error: string = $state('');
  let success: string = $state('');

  const tabs = [
    { value: 'api-key', label: 'API Key', icon: Key },
    { value: 'defaults', label: 'Defaults', icon: SlidersHorizontal },
    { value: 'appearance', label: 'Appearance', icon: Palette },
    { value: 'about', label: 'About', icon: Info },
  ];

  const sizeOptions = Object.entries(OUTPUT_SIZES).map(([value, { label }]) => ({ value: value as OutputSize, label }));
  const ratioOptions = Object.entries(ASPECT_RATIOS).map(([value, label]) => ({ value: value as AspectRatio, label }));
  const tempOptions = TEMPERATURES.map((t) => ({ value: String(t), label: t === 0 ? 'Precise' : t === 2 ? 'Creative' : String(t) }));

  onMount(() => {
    config.load();
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

<!-- Settings titlebar (draggable) -->
<div
  data-tauri-drag-region
  class="sticky top-0 z-40 glass border-b border-[var(--glass-border)]"
  style="-webkit-app-region: drag;"
>
  <div class="flex items-center gap-3 px-4 py-2.5" style="padding-left: 86px;">
    <a
      href="/"
      class="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-colors"
      aria-label="Back"
      style="-webkit-app-region: no-drag;"
    >
      <ArrowLeft size={18} />
    </a>
    <h1 class="text-sm font-semibold text-[var(--text)]">Settings</h1>
  </div>
</div>

<div class="px-6 py-6">
  <!-- Tab navigation -->
  <div class="flex gap-1 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-1 mb-6">
    {#each tabs as tab}
      <button
        onclick={() => { activeTab = tab.value; }}
        class="flex items-center gap-1.5 flex-1 justify-center rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-colors {activeTab === tab.value ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}"
      >
        <svelte:component this={tab.icon} size={14} />
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- API Key -->
  {#if activeTab === 'api-key'}
    <div class="flex flex-col gap-4">
      <div class="glass p-5 flex flex-col gap-4">
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
      </div>

      <button
        onclick={() => openExternal('https://aistudio.google.com/apikey')}
        class="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
      >
        <ExternalLink size={12} />
        Get an API key from Google AI Studio
      </button>
    </div>

  <!-- Defaults -->
  {:else if activeTab === 'defaults'}
    <div class="glass p-5 flex flex-col gap-4">
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

  <!-- Appearance -->
  {:else if activeTab === 'appearance'}
    <div class="glass p-5 flex flex-col gap-4">
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

  <!-- About -->
  {:else if activeTab === 'about'}
    <div class="flex flex-col gap-4">
    <div class="glass p-5 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-subtle)]">
          <span class="text-lg">🍌</span>
        </div>
        <div>
          <h2 class="text-sm font-semibold text-[var(--text)]">Nanobanana Studio</h2>
          <p class="text-xs text-[var(--muted)]">Version 0.1.0</p>
        </div>
      </div>

      <p class="text-sm text-[var(--text)] leading-relaxed">
        Batch image generation powered by Gemini 3.1 Pro Preview. Submit multiple prompts at once, track progress in real-time, and download results — all at 50% of the standard API cost.
      </p>

      <div class="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--muted)]">Model</span>
          <span class="text-[var(--text)] font-mono">gemini-3.1-pro-preview</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--muted)]">Platform</span>
          <span class="text-[var(--text)]">macOS (Tauri v2)</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--muted)]">Stack</span>
          <span class="text-[var(--text)]">SvelteKit + Bits UI + Rust</span>
        </div>
      </div>
    </div>

    <!-- Support -->
    <div class="glass p-5 flex flex-col gap-4">
      <div>
        <h2 class="text-sm font-semibold text-[var(--text)]">Support the Project</h2>
        <p class="text-xs text-[var(--muted)] mt-1">Enjoying Nanobanana Studio? Consider buying me a coffee!</p>
      </div>

      <button
        onclick={() => openExternal('https://buymeacoffee.com/aaronkwhite')}
        class="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] group cursor-pointer"
      >
        <Coffee size={18} class="text-[var(--accent)] group-hover:text-[var(--accent-hover)]" />
        <span class="text-sm font-medium text-[var(--text)]">Buy Me a Coffee</span>
      </button>

      <p class="text-xs text-[var(--muted)] text-center">
        Made with <Heart size={10} class="inline text-[var(--error)]" /> by Aaron K. White
      </p>
    </div>

    <!-- Legal -->
    <div class="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-2">
      <h3 class="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">The Fine Print</h3>
      <p class="text-xs text-[var(--muted)] leading-relaxed">
        Nanobanana Studio is an independent product created by Aaron K. White. It is not affiliated with, endorsed by, sponsored by, or in any way officially connected with Google LLC, Alphabet Inc., or any of their subsidiaries or affiliates.
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
