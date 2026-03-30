import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Button from './Button.svelte';

function textSnippet(text: string) {
  return createRawSnippet(() => ({
    render: () => `<span>${text}</span>`,
  }));
}

describe('Button', () => {
  it('renders with text', () => {
    render(Button, { props: { children: textSnippet('Click me') } });
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('applies primary variant by default', () => {
    render(Button, { props: { children: textSnippet('Test') } });
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-primary');
  });

  it('disables when disabled prop is true', () => {
    render(Button, { props: { disabled: true, children: textSnippet('Test') } });
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
