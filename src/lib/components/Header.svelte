<script lang="ts">
  import { Sun, Moon, Monitor, Settings, AlertTriangle, Key } from 'lucide-svelte';
  import { Tooltip } from '$lib/components/ui';
  import { theme } from '$lib/stores/theme';
  import { config } from '$lib/stores/config';

  const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const;
  const ThemeIcon = $derived(themeIcons[$theme]);
</script>

<header
  data-tauri-drag-region
  class="glass sticky top-0 z-40 border-b border-[var(--glass-border)] titlebar"
>
  <!-- Top row: centered title with traffic light space -->
  <div data-tauri-drag-region class="flex items-center justify-between px-4 py-2.5">
    <!-- Left spacer for traffic lights (86px) -->
    <div class="shrink-0" style="width: 86px;"></div>

    <!-- Center: title -->
    <div data-tauri-drag-region class="flex items-center gap-2">
      <span class="text-sm font-semibold text-[var(--text)]">Nanobanana Studio</span>
    </div>

    <!-- Right: actions (no-drag so buttons work) -->
    <div class="flex items-center gap-1.5 no-drag">
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

  <!-- API key warning toast -->
  {#if !$config.has_key}
    <div class="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 no-drag">
      <div class="flex items-center gap-2 rounded-lg border border-[rgba(128,128,128,0.12)] bg-[var(--surface)] px-3 py-1.5 shadow-md backdrop-blur-sm">
        <Key size={14} class="text-[var(--accent)]" />
        <span class="text-xs font-medium text-[var(--muted)] whitespace-nowrap">No API key configured</span>
        <a href="/settings" class="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap">Add key →</a>
      </div>
    </div>
  {/if}
</header>

<style>
  .titlebar {
    -webkit-app-region: drag;
  }
  .no-drag {
    -webkit-app-region: no-drag;
  }
</style>
