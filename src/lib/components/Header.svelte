<script lang="ts">
  import { Sun, Moon, Monitor, Settings, AlertTriangle } from 'lucide-svelte';
  import { Badge, Tooltip } from '$lib/components/ui';
  import { theme } from '$lib/stores/theme';
  import { config } from '$lib/stores/config';
  import { activeJobsCount } from '$lib/stores/jobs';

  const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const;
  const ThemeIcon = $derived(themeIcons[$theme]);
</script>

<header
  data-tauri-drag-region
  class="glass sticky top-0 z-40 flex items-center justify-between pl-20 pr-4 py-2.5 border-b border-[var(--glass-border)]"
>
  <div class="flex items-center gap-3">
    <a href="/" class="flex items-center gap-2 text-[var(--text)] no-underline">
      <span class="text-sm font-semibold">Nanobanana Studio</span>
    </a>
    {#if $activeJobsCount > 0}
      <Badge variant="accent">{$activeJobsCount} active</Badge>
    {/if}
    {#if !$config.has_key}
      <Tooltip text="No API key configured">
        <span class="text-[var(--warning)]">
          <AlertTriangle size={16} />
        </span>
      </Tooltip>
    {/if}
  </div>

  <div class="flex items-center gap-1.5">
    <Tooltip text="Toggle theme">
      <button
        onclick={() => theme.toggle()}
        class="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition-colors hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]"
        aria-label="Toggle theme"
      >
        <ThemeIcon size={16} />
      </button>
    </Tooltip>
    <Tooltip text="Settings">
      <a
        href="/settings"
        class="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition-colors hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]"
        aria-label="Settings"
      >
        <Settings size={16} />
      </a>
    </Tooltip>
  </div>
</header>
