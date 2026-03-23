<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: Snippet;
  }

  let { variant = 'primary', size = 'md', children, class: className = '', ...rest }: Props = $props();

  const baseClasses = 'btn inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 disabled:pointer-events-none tracking-tight';

  const variantClasses = {
    primary: 'btn-primary bg-[var(--accent)] text-[var(--accent-text)] shadow-[0_0.5px_1px_rgba(0,0,0,0.1)] hover:opacity-[0.88] active:translate-y-[0.5px] active:opacity-80',
    secondary: 'btn-secondary bg-[var(--neutral-tint)] text-[var(--text)] border-[0.5px] border-[rgba(0,0,0,0.06)] hover:bg-[rgba(128,128,128,0.1)] active:translate-y-[0.5px]',
    ghost: 'btn-ghost text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--neutral-tint)] active:translate-y-[0.5px]',
    danger: 'btn-danger bg-[var(--error)] text-white shadow-[0_0.5px_1px_rgba(0,0,0,0.1)] hover:opacity-[0.88] active:translate-y-[0.5px] active:opacity-80',
  };

  const sizeClasses = {
    sm: 'h-7 px-2.5 text-xs gap-1.5',
    md: 'h-[34px] px-3.5 text-[13px] gap-2',
    lg: 'h-10 px-5 text-sm gap-2.5',
  };
</script>

<button
  class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {className}"
  style="transition: opacity 0.15s ease, transform 0.1s ease;"
  {...rest}
>
  {@render children()}
</button>
