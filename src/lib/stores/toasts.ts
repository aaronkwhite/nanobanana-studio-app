// src/lib/stores/toasts.ts
import { writable } from 'svelte/store';

export type ToastVariant = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

const DEFAULT_TIMEOUT_MS = 5000;

function createToastsStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  let nextId = 1;

  function push(message: string, variant: ToastVariant = 'info', timeoutMs = DEFAULT_TIMEOUT_MS) {
    const id = nextId++;
    update((toasts) => [...toasts, { id, message, variant }]);
    if (timeoutMs > 0 && typeof setTimeout !== 'undefined') {
      setTimeout(() => dismiss(id), timeoutMs);
    }
    return id;
  }

  function dismiss(id: number) {
    update((toasts) => toasts.filter((t) => t.id !== id));
  }

  function clear() {
    update(() => []);
  }

  return {
    subscribe,
    push,
    error: (message: string, timeoutMs?: number) => push(message, 'error', timeoutMs),
    success: (message: string, timeoutMs?: number) => push(message, 'success', timeoutMs),
    info: (message: string, timeoutMs?: number) => push(message, 'info', timeoutMs),
    dismiss,
    clear,
  };
}

export const toasts = createToastsStore();

export function toastError(err: unknown, fallback = 'Something went wrong'): void {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
  toasts.error(message);
}
