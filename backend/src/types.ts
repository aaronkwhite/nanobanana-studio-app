// backend/src/types.ts

// PocketBase record shapes
export interface CreditLedgerRecord {
  id: string;
  user_id: string;
  amount: number;          // positive = credit, negative = debit
  balance_after: number;
  type: 'purchase' | 'generation' | 'refund';
  reference_id: string;
  created: string;
}

export interface JobRecord {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  mode: 'realtime' | 'batch';
  model: 'nano-banana-pro' | '4o-image' | 'flux-kontext';
  credits_cost: number;
  kie_job_id: string;
  created: string;
  updated: string;
}

export interface JobItemRecord {
  id: string;
  job_id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  prompt: string;
  resolution: '1K' | '2K' | '4K';
  output_url: string;
  error: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  stripe_session_id: string;
  credits_purchased: number;
  amount_paid_cents: number;
  status: 'pending' | 'complete' | 'refunded';
}

// Request/response shapes
export interface GenerateRequest {
  model: 'nano-banana-pro' | '4o-image' | 'flux-kontext';
  resolution: '1K' | '2K' | '4K';
  prompts: string[];
  aspect_ratio?: string;
}

export interface PurchaseRequest {
  pack: 'starter' | 'standard' | 'pro';
}

// Credit pack definitions (single source of truth)
export const CREDIT_PACKS = {
  starter:  { credits: 100,   price_cents: 499  },
  standard: { credits: 500,   price_cents: 1999 },
  pro:      { credits: 1200,  price_cents: 3999 },
} as const;

// Credit cost per generation
export const CREDIT_COSTS: Record<
  JobRecord['model'],
  Record<JobItemRecord['resolution'], number>
> = {
  'nano-banana-pro': { '1K': 1, '2K': 2, '4K': 3 },
  '4o-image':        { '1K': 2, '2K': 3, '4K': 4 },
  'flux-kontext':    { '1K': 2, '2K': 3, '4K': 4 },
};

export const BATCH_DISCOUNT = 0.8; // 20% off for batch mode

export function calculateCreditCost(
  model: JobRecord['model'],
  resolution: JobItemRecord['resolution'],
  mode: JobRecord['mode'],
  count: number
): number {
  const unitCost = CREDIT_COSTS[model][resolution];
  const discount = mode === 'batch' ? BATCH_DISCOUNT : 1;
  return Math.ceil(unitCost * discount * count);
}
