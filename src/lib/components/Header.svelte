<script lang="ts">
  import { Sun, Moon, Monitor, Settings, AlertTriangle, Key } from 'lucide-svelte';
  import { Badge, Tooltip } from '$lib/components/ui';
  import { theme } from '$lib/stores/theme';
  import { config } from '$lib/stores/config';
  import { activeJobsCount } from '$lib/stores/jobs';

  const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const;
  const ThemeIcon = $derived(themeIcons[$theme]);
</script>

<header
  data-tauri-drag-region
  class="glass sticky top-0 z-40 border-b border-[var(--glass-border)]"
>
  <!-- Top row: centered title with traffic light space -->
  <div class="flex items-center justify-between px-4 py-2.5">
    <!-- Left spacer for traffic lights (86px) -->
    <div class="shrink-0" style="width: 86px;"></div>

    <!-- Center: title + badges -->
    <div class="flex items-center gap-2">
      <a href="/" class="text-sm font-semibold text-[var(--text)] no-underline">
        Nanobanana Studio
      </a>
      {#if $activeJobsCount > 0}
        <Badge variant="accent">{$activeJobsCount} active</Badge>
      {/if}
    </div>

    <!-- Right: actions -->
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
  </div>

  <!-- API key warning banner -->
  {#if !$config.has_key}
    <div class="flex items-center justify-center gap-2 border-t border-[var(--glass-border)] bg-[var(--warning)]/10 px-4 py-1.5">
      <Key size={14} class="text-[var(--warning)]" />
      <span class="text-xs font-medium text-[var(--warning)]">No API key configured</span>
      <a href="/settings" class="text-xs font-medium text-[var(--accent)] hover:underline">Add key →</a>
    </div>
  {/if}
</header>
