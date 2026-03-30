import { describe, it, expect } from 'vitest';
import { OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES, calculateCost } from './index';

describe('OUTPUT_SIZES', () => {
  it('has correct prices', () => {
    expect(OUTPUT_SIZES['1K'].price).toBe(0.02);
    expect(OUTPUT_SIZES['2K'].price).toBe(0.07);
    expect(OUTPUT_SIZES['4K'].price).toBe(0.12);
  });
});

describe('ASPECT_RATIOS', () => {
  it('has 5 ratios', () => {
    expect(Object.keys(ASPECT_RATIOS)).toHaveLength(5);
  });
});

describe('TEMPERATURES', () => {
  it('ranges from 0 to 2 in 0.5 steps', () => {
    expect(TEMPERATURES).toEqual([0, 0.5, 1, 1.5, 2]);
  });
});

describe('calculateCost', () => {
  it('calculates cost for 1K images', () => {
    expect(calculateCost('1K', 10)).toBe(0.2);
  });

  it('calculates cost for 4K images', () => {
    expect(calculateCost('4K', 5)).toBe(0.6);
  });

  it('returns 0 for zero items', () => {
    expect(calculateCost('1K', 0)).toBe(0);
  });
});
