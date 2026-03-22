import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HeaderTestWrapper from './HeaderTestWrapper.svelte';

describe('Header', () => {
  it('renders app name', () => {
    render(HeaderTestWrapper);
    expect(screen.getByText('Nana Studio')).toBeInTheDocument();
  });

  it('renders settings link', () => {
    render(HeaderTestWrapper);
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });
});
