<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    glass?: boolean;
    class?: string;
    children: Snippet;
  }

  let { glass = true, class: className = '', children }: Props = $props();
</script>

<div
  class="{glass ? 'glass' : 'bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]'} transition-[border-color] duration-[var(--transition-fast)] hover:border-[color-mix(in_srgb,var(--glass-border)_80%,var(--accent)_20%)] {className}"
>
  {@render children()}
</div>
