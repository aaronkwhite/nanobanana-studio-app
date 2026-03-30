import { describe, it, expect } from 'vitest';
import { sizeOptions, ratioOptions, tempOptions } from './options';

describe('sizeOptions', () => {
  it('contains all output sizes', () => {
    const values = sizeOptions.map(o => o.value);
    expect(values).toEqual(['1K', '2K', '4K']);
  });

  it('includes price in labels', () => {
    expect(sizeOptions[0].label).toContain('$0.02');
  });
});

describe('ratioOptions', () => {
  it('contains all aspect ratios', () => {
    const values = ratioOptions.map(o => o.value);
    expect(values).toEqual(['1:1', '16:9', '9:16', '4:3', '3:4']);
  });

  it('has human-readable labels', () => {
    const labels = ratioOptions.map(o => o.label);
    expect(labels).toContain('Square');
    expect(labels).toContain('Wide');
    expect(labels).toContain('Portrait');
  });
});

describe('tempOptions', () => {
  it('contains all temperature values as strings', () => {
    const values = tempOptions.map(o => o.value);
    expect(values).toEqual(['0', '0.5', '1', '1.5', '2']);
  });

  it('labels extremes with descriptors', () => {
    const labels = tempOptions.map(o => o.label);
    expect(labels[0]).toBe('0 (Precise)');
    expect(labels[2]).toBe('1 (Default)');
    expect(labels[4]).toBe('2 (Creative)');
  });

  it('labels middle values as plain numbers', () => {
    expect(tempOptions[1].label).toBe('0.5');
    expect(tempOptions[3].label).toBe('1.5');
  });
});
