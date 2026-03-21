<script lang="ts">
  interface Props {
    variant?: 'default' | 'accent' | 'success' | 'error';
    class?: string;
    children: import('svelte').Snippet;
  }

  let { variant = 'default', class: className = '', children }: Props = $props();

  const variantClasses = {
    default: 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]',
    accent: 'bg-[var(--accent)] text-[var(--accent-text)]',
    success: 'bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success-border)]',
    error: 'bg-[var(--error-subtle)] text-[var(--error)] border border-[var(--error-border)]',
  };
</script>

<span
  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {variantClasses[variant]} {className}"
>
  {@render children()}
</span>
