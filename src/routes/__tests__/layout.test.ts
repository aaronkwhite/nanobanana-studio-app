import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';

import Layout from '../+layout.svelte';

describe('+layout.svelte', () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('should render children via slot', () => {
		const { container } = render(Layout, {
			props: {
				children: () => {
					const el = document.createElement('div');
					el.textContent = 'Test Child Content';
					el.setAttribute('data-testid', 'child');
					return el;
				}
			}
		});

		// Layout should render without error
		expect(container).toBeTruthy();
	});

	it('should set document title', () => {
		render(Layout, {
			props: {
				children: () => document.createElement('div')
			}
		});

		// svelte:head sets the title
		expect(document.title).toBe('Nanobanana Studio');
	});
});
