import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { toasts, toastError } from './toasts';

describe('toasts store', () => {
  beforeEach(() => {
    toasts.clear();
    vi.useRealTimers();
  });

  it('push adds a toast with an auto-incrementing id', () => {
    toasts.clear();
    const id1 = toasts.push('first');
    const id2 = toasts.push('second');
    expect(id2).toBe(id1 + 1);
    const list = get(toasts);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ message: 'first', variant: 'info' });
  });

  it('error/success/info convenience methods set the variant', () => {
    toasts.error('boom');
    toasts.success('yay');
    toasts.info('hi');
    const list = get(toasts);
    expect(list.map((t) => t.variant)).toEqual(['error', 'success', 'info']);
  });

  it('dismiss removes a toast by id', () => {
    const id = toasts.push('goodbye');
    toasts.dismiss(id);
    expect(get(toasts)).toHaveLength(0);
  });

  it('auto-dismisses after the timeout', () => {
    vi.useFakeTimers();
    toasts.push('temp', 'info', 1000);
    expect(get(toasts)).toHaveLength(1);
    vi.advanceTimersByTime(1001);
    expect(get(toasts)).toHaveLength(0);
  });

  it('timeoutMs=0 disables auto-dismiss', () => {
    vi.useFakeTimers();
    toasts.push('sticky', 'info', 0);
    vi.advanceTimersByTime(60_000);
    expect(get(toasts)).toHaveLength(1);
  });
});

describe('toastError', () => {
  beforeEach(() => toasts.clear());

  it('surfaces Error.message', () => {
    toastError(new Error('bad happened'));
    expect(get(toasts)[0].message).toBe('bad happened');
  });

  it('surfaces string errors as-is', () => {
    toastError('raw string error');
    expect(get(toasts)[0].message).toBe('raw string error');
  });

  it('falls back when the value is not stringable', () => {
    toastError({ oops: true } as unknown);
    expect(get(toasts)[0].message).toBe('Something went wrong');
  });

  it('always uses the error variant', () => {
    toastError('x');
    expect(get(toasts)[0].variant).toBe('error');
  });
});
