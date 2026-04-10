// backend/tests/credits.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateCreditCost } from '../src/types.ts';

describe('calculateCreditCost', () => {
  it('calculates realtime cost correctly', () => {
    expect(calculateCreditCost('nano-banana-pro', '1K', 'realtime', 1)).toBe(1);
    expect(calculateCreditCost('nano-banana-pro', '2K', 'realtime', 1)).toBe(2);
    expect(calculateCreditCost('nano-banana-pro', '4K', 'realtime', 1)).toBe(3);
  });

  it('applies batch discount (total then ceil)', () => {
    // 1K batch: ceil(1 * 0.8 * 5) = ceil(4.0) = 4 (saves 1 credit vs realtime 5)
    expect(calculateCreditCost('nano-banana-pro', '1K', 'batch', 5)).toBe(4);
    // 4K batch: ceil(3 * 0.8 * 1) = ceil(2.4) = 3 (no saving at count=1, ceiling absorbs it)
    expect(calculateCreditCost('nano-banana-pro', '4K', 'batch', 1)).toBe(3);
    // 2K batch: ceil(2 * 0.8 * 5) = ceil(8.0) = 8 (saves 2 credits vs realtime 10)
    expect(calculateCreditCost('nano-banana-pro', '2K', 'batch', 5)).toBe(8);
  });

  it('multiplies cost by item count', () => {
    expect(calculateCreditCost('nano-banana-pro', '1K', 'realtime', 10)).toBe(10);
    expect(calculateCreditCost('nano-banana-pro', '4K', 'realtime', 3)).toBe(9);
  });
});

import { createMockPocketBase } from './helpers/mockPocketBase';

// Mock getPocketBase before importing credits service
vi.mock('../src/services/pocketbase.ts', () => ({
  getPocketBase: vi.fn(),
  verifyUserToken: vi.fn(),
}));

import { getBalance, deductCredits, creditAccount } from '../src/services/credits.ts';
import { getPocketBase } from '../src/services/pocketbase.ts';

describe('getBalance', () => {
  beforeEach(() => {
    vi.mocked(getPocketBase).mockReset();
  });

  it('returns balance_after from most recent ledger record', async () => {
    vi.mocked(getPocketBase).mockResolvedValue(
      createMockPocketBase(vi.fn().mockResolvedValue({ balance_after: 42 }))
    );

    const balance = await getBalance('user-123');
    expect(balance).toBe(42);
  });

  it('returns 0 when no ledger records exist', async () => {
    vi.mocked(getPocketBase).mockResolvedValue(
      createMockPocketBase(vi.fn().mockRejectedValue(new Error('Not found')))
    );

    const balance = await getBalance('user-123');
    expect(balance).toBe(0);
  });
});

describe('deductCredits', () => {
  beforeEach(() => {
    vi.mocked(getPocketBase).mockReset();
  });

  it('throws on insufficient credits', async () => {
    vi.mocked(getPocketBase).mockResolvedValue(
      createMockPocketBase(vi.fn().mockResolvedValue({ balance_after: 2 }))
    );

    await expect(
      deductCredits({ userId: 'user-123', model: 'nano-banana-pro', resolution: '4K', mode: 'realtime', count: 1, referenceId: 'job-1' })
    ).rejects.toThrow('Insufficient credits');
  });

  it('writes debit entry and returns cost when balance is sufficient', async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    const mockGetFirstListItem = vi.fn().mockResolvedValue({ balance_after: 10 });
    const pb = createMockPocketBase(mockGetFirstListItem);
    Object.assign(pb, { collection: () => ({ getFirstListItem: mockGetFirstListItem, create: mockCreate }) });
    vi.mocked(getPocketBase).mockResolvedValue(pb);

    const cost = await deductCredits({
      userId: 'user-123',
      model: 'nano-banana-pro',
      resolution: '1K',
      mode: 'realtime',
      count: 1,
      referenceId: 'job-1',
    });

    expect(cost).toBe(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-123',
      amount: -1,
      balance_after: 9,
      type: 'generation',
      reference_id: 'job-1',
    }));
  });

  it('succeeds when balance exactly equals cost', async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    const mockGetFirstListItem = vi.fn().mockResolvedValue({ balance_after: 3 });
    const pb = createMockPocketBase(mockGetFirstListItem);
    Object.assign(pb, { collection: () => ({ getFirstListItem: mockGetFirstListItem, create: mockCreate }) });
    vi.mocked(getPocketBase).mockResolvedValue(pb);

    // nano-banana-pro 4K realtime = 3 credits, balance = 3 → exact match
    const cost = await deductCredits({
      userId: 'user-123',
      model: 'nano-banana-pro',
      resolution: '4K',
      mode: 'realtime',
      count: 1,
      referenceId: 'job-exact',
    });

    expect(cost).toBe(3);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount: -3,
      balance_after: 0,
    }));
  });
});

describe('creditAccount', () => {
  beforeEach(() => {
    vi.mocked(getPocketBase).mockReset();
  });

  it('writes credit entry and returns new balance', async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    const mockGetFirstListItem = vi.fn().mockResolvedValue({ balance_after: 5 });
    const pb = createMockPocketBase(mockGetFirstListItem);
    Object.assign(pb, { collection: () => ({ getFirstListItem: mockGetFirstListItem, create: mockCreate }) });
    vi.mocked(getPocketBase).mockResolvedValue(pb);

    const newBalance = await creditAccount({
      userId: 'user-123',
      amount: 100,
      type: 'purchase',
      referenceId: 'stripe-session-1',
    });

    expect(newBalance).toBe(105);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-123',
      amount: 100,
      balance_after: 105,
      type: 'purchase',
      reference_id: 'stripe-session-1',
    }));
  });

  it('credits correctly when starting balance is zero (first purchase)', async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    const mockGetFirstListItem = vi.fn().mockRejectedValue(new Error('Not found'));
    const pb = createMockPocketBase(mockGetFirstListItem);
    Object.assign(pb, { collection: () => ({ getFirstListItem: mockGetFirstListItem, create: mockCreate }) });
    vi.mocked(getPocketBase).mockResolvedValue(pb);

    const newBalance = await creditAccount({
      userId: 'user-123',
      amount: 100,
      type: 'purchase',
      referenceId: 'stripe-session-1',
    });

    expect(newBalance).toBe(100);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount: 100,
      balance_after: 100,
    }));
  });

  it('writes refund type to ledger correctly', async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    const mockGetFirstListItem = vi.fn().mockResolvedValue({ balance_after: 0 });
    const pb = createMockPocketBase(mockGetFirstListItem);
    Object.assign(pb, { collection: () => ({ getFirstListItem: mockGetFirstListItem, create: mockCreate }) });
    vi.mocked(getPocketBase).mockResolvedValue(pb);

    await creditAccount({
      userId: 'user-123',
      amount: 3,
      type: 'refund',
      referenceId: 'job-failed-1',
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'refund',
    }));
  });
});
