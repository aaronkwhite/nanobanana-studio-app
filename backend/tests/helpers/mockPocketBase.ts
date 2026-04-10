import { vi } from 'vitest';

/**
 * Creates a mock PocketBase instance with a filter() implementation
 * that performs {:param} substitution client-side, matching real SDK behavior.
 */
export function createMockPocketBase(getFirstListItemFn: any) {
  return {
    filter: vi.fn((template: string, params: Record<string, any>) => {
      // Simulate PocketBase filter substitution: replace {:paramName} with the actual value
      return template.replace(/{:(\w+)}/g, (_, key) => {
        const value = params[key];
        return typeof value === 'string' ? `'${value}'` : String(value);
      });
    }),
    collection: () => ({
      getFirstListItem: getFirstListItemFn,
      create: vi.fn().mockResolvedValue({}),
    }),
  } as any;
}
