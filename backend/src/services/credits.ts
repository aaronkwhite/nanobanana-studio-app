// backend/src/services/credits.ts
import { getPocketBase } from './pocketbase.ts';
import type { CreditLedgerRecord, JobRecord, JobItemRecord } from '../types.ts';
import { calculateCreditCost } from '../types.ts';

// Returns the user's current credit balance.
// Uses the balance_after snapshot on the most recent record for O(1) reads.
export async function getBalance(userId: string): Promise<number> {
  const pb = await getPocketBase();
  try {
    const record = await pb.collection('credit_ledger').getFirstListItem<CreditLedgerRecord>(
      `user_id = "${userId}"`,
      { sort: '-created', fields: 'balance_after' }
    );
    return record.balance_after;
  } catch {
    // No records = zero balance
    return 0;
  }
}

// Deducts credits for a generation job.
// Returns the cost deducted (positive number). Throws if insufficient credits.
export async function deductCredits(params: {
  userId: string;
  model: JobRecord['model'];
  resolution: JobItemRecord['resolution'];
  mode: JobRecord['mode'];
  count: number;
  referenceId: string;
}): Promise<number> {
  const pb = await getPocketBase();
  const cost = calculateCreditCost(params.model, params.resolution, params.mode, params.count);
  const currentBalance = await getBalance(params.userId);

  if (currentBalance < cost) {
    throw new Error(`Insufficient credits: have ${currentBalance}, need ${cost}`);
  }

  const newBalance = currentBalance - cost;
  await pb.collection('credit_ledger').create<CreditLedgerRecord>({
    user_id: params.userId,
    amount: -cost,
    balance_after: newBalance,
    type: 'generation',
    reference_id: params.referenceId,
  });

  return cost;
}

// Credits a user's account (used after Stripe payment or KIE job refund).
// Returns the new balance.
export async function creditAccount(params: {
  userId: string;
  amount: number;
  type: 'purchase' | 'refund';
  referenceId: string;
}): Promise<number> {
  const pb = await getPocketBase();
  const currentBalance = await getBalance(params.userId);
  const newBalance = currentBalance + params.amount;

  await pb.collection('credit_ledger').create<CreditLedgerRecord>({
    user_id: params.userId,
    amount: params.amount,
    balance_after: newBalance,
    type: params.type,
    reference_id: params.referenceId,
  });

  return newBalance;
}
