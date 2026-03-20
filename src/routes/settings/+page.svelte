<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, Eye, EyeOff, Sun, Moon, Monitor } from 'lucide-svelte';
  import { Button, Input, Select, Tabs } from '$lib/components/ui';
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

  const tabList = [
    { value: 'api-key', label: 'API Key' },
    { value: 'defaults', label: 'Defaults' },
    { value: 'appearance', label: 'Appearance' },
    { value: 'about', label: 'About' },
  ];

  const sizeOptions = Object.entries(OUTPUT_SIZES).map(([value, { label }]) => ({ value: value as OutputSize, label }));
  const ratioOptions = Object.entries(ASPECT_RATIOS).map(([value, label]) => ({ value: value as AspectRatio, label }));
  const tempOptions = TEMPERATURES.map((t) => ({ value: String(t), label: t === 0 ? 'Precise' : t === 2 ? 'Creative' : String(t) }));
  const themeOptions = [
    { value: 'light' as Theme, label: 'Light' },
    { value: 'dark' as Theme, label: 'Dark' },
    { value: 'system' as Theme, label: 'System' },
  ];

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

<div class="mx-auto max-w-2xl px-4 py-6">
  <div class="flex items-center gap-3 mb-6">
    <a
      href="/"
      class="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-colors"
      aria-label="Back"
    >
      <ArrowLeft size={18} />
    </a>
    <h1 class="text-lg font-semibold text-[var(--text)]">Settings</h1>
  </div>

  <Tabs tabs={tabList} bind:value={activeTab} class="mb-6" />

  {#if activeTab === 'api-key'}
    <div class="glass p-4 flex flex-col gap-4">
      <div>
        <h2 class="text-sm font-semibold text-[var(--text)]">Gemini API Key</h2>
        <p class="text-xs text-[var(--muted)] mt-1">
          Get your API key from <a href="https://aistudio.google.com/apikey" target="_blank" class="text-[var(--accent)] hover:underline">Google AI Studio</a>
        </p>
      </div>

      {#if $config.has_key}
        <div class="flex items-center gap-3">
          <code class="flex-1 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm font-mono text-[var(--muted)]">
            {$config.masked}
          </code>
          <Button variant="danger" size="sm" onclick={removeApiKey}>Remove</Button>
        </div>
      {:else}
        <div class="flex flex-col gap-2">
          <div class="relative">
            <Input
              bind:value={apiKey}
              type={showKey ? 'text' : 'password'}
              placeholder="Enter your Gemini API key"
              {error}
            />
            <button
              onclick={() => { showKey = !showKey; }}
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {#if showKey}
                <EyeOff size={16} />
              {:else}
                <Eye size={16} />
              {/if}
            </button>
          </div>
          <Button onclick={saveApiKey} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Test & Save'}
          </Button>
        </div>
      {/if}

      {#if success}
        <p class="text-xs text-[var(--success)]">{success}</p>
      {/if}
    </div>
  {:else if activeTab === 'defaults'}
    <div class="glass p-4 flex flex-col gap-4">
      <h2 class="text-sm font-semibold text-[var(--text)]">Generation Defaults</h2>
      <p class="text-xs text-[var(--muted)]">These values pre-fill new generation forms.</p>
      <div class="flex flex-col gap-3">
        <Select
          label="Default Output Size"
          options={sizeOptions}
          value={$settings.output_size}
          onchange={(v) => settings.update({ output_size: v })}
        />
        <Select
          label="Default Aspect Ratio"
          options={ratioOptions}
          value={$settings.aspect_ratio}
          onchange={(v) => settings.update({ aspect_ratio: v })}
        />
        <Select
          label="Default Temperature"
          options={tempOptions}
          value={String($settings.temperature)}
          onchange={(v) => settings.update({ temperature: Number(v) })}
        />
      </div>
      <Button variant="ghost" size="sm" onclick={() => settings.reset()}>
        Reset to defaults
      </Button>
    </div>
  {:else if activeTab === 'appearance'}
    <div class="glass p-4 flex flex-col gap-4">
      <h2 class="text-sm font-semibold text-[var(--text)]">Theme</h2>
      <div class="flex gap-2">
        {#each themeOptions as opt}
          <Button
            variant={$theme === opt.value ? 'primary' : 'secondary'}
            size="sm"
            onclick={() => theme.set(opt.value)}
          >
            {#if opt.value === 'light'}<Sun size={14} />{:else if opt.value === 'dark'}<Moon size={14} />{:else}<Monitor size={14} />{/if}
            {opt.label}
          </Button>
        {/each}
      </div>
    </div>
  {:else if activeTab === 'about'}
    <div class="glass p-4 flex flex-col gap-3">
      <h2 class="text-sm font-semibold text-[var(--text)]">Nanobanana Studio</h2>
      <p class="text-xs text-[var(--muted)]">Version 0.1.0</p>
      <p class="text-sm text-[var(--text)]">Batch image generation powered by Gemini 3.1 Pro Preview.</p>
    </div>
  {/if}
</div>
