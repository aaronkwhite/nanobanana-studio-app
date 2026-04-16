// src/lib/utils/dom-id.ts
// Monotonic per-session counter for generating stable fallback IDs for
// form controls that don't get an explicit `id` prop. Using Math.random
// in a render body produces a new value every re-render, which breaks
// label-for associations; a counter is stable per component instance.

let counter = 0;

export function nextDomId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
