<script lang="ts">
  interface Props {
    value: number;
    max?: number;
    class?: string;
  }

  let { value, max = 100, class: className = '' }: Props = $props();

  const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div
  class="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden {className}"
  role="progressbar"
  aria-valuenow={value}
  aria-valuemin={0}
  aria-valuemax={max}
>
  <div
    class="h-full rounded-full bg-[var(--accent)] transition-[width] duration-[var(--transition-slow)]"
    style="width: {percentage}%"
  ></div>
</div>
