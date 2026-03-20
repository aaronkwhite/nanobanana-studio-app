import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Header from './Header.svelte';

describe('Header', () => {
  it('renders app name', () => {
    render(Header);
    expect(screen.getByText('Nanobanana Studio')).toBeInTheDocument();
  });

  it('renders settings link', () => {
    render(Header);
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });
});
