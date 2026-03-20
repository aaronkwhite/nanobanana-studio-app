<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: Snippet;
  }

  let { variant = 'primary', size = 'md', children, class: className = '', ...rest }: Props = $props();

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses = {
    primary: 'btn-primary bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]',
    secondary: 'btn-secondary bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--accent-subtle)]',
    ghost: 'btn-ghost text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]',
    danger: 'btn-danger bg-[var(--error)] text-white hover:opacity-90',
  };

  const sizeClasses = {
    sm: 'h-7 px-2.5 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2.5',
  };
</script>

<button
  class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {className}"
  {...rest}
>
  {@render children()}
</button>
