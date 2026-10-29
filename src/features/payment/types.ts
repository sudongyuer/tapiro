import type { CurrencyCode, Money } from '@/lib/money';
import type { PayeeMethod, PayeeType } from '@/lib/payeeMethods';
import type { BountyCategory } from '@/lib/stickers/category';

export const PAYMENT_STATES = ['due', 'marked_paid', 'settled', 'disputed'] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];
export type PaymentRole = 'payer' | 'payee';

export type Payment = {
  id: string;
  itemKind: 'bounty' | 'ride';
  category: BountyCategory | null;
  title: string;
  amount: Money;
  paid: Money | null;
  reference: string;
  state: PaymentState;
  role: PaymentRole;
  counterpartId: string | null;
  counterpartName: string;
  methodType: PayeeType | null;
  proofPath: string | null;
  nudgedAt: string | null;
  markedPaidAt: string | null;
  createdAt: string;
  reverses: string | null;
};

export type FxRate = {
  base: CurrencyCode;
  quote: CurrencyCode;
  quotePerBase: number;
  rateDate: string;
  source: string;
};

export class NoRateError extends Error {
  constructor() {
    super('no_rate');
    this.name = 'NoRateError';
  }
}

export type SettleResult = { firstSettled: boolean; stickerCount: number | null };

export type PaymentService = {
  list(userId: string): Promise<Payment[]>;
  get(userId: string, id: string): Promise<Payment | null>;
  methodsOf(userId: string): Promise<PayeeMethod[]>;
  latestRate(currency: CurrencyCode, other: CurrencyCode): Promise<FxRate | null>;
  uploadProof(paymentId: string, fileUri: string): Promise<string>;
  removeProof(path: string): Promise<void>;
  proofUrl(path: string): Promise<string>;
  markPaid(paymentId: string, methodId: string, proofPath: string | null): Promise<void>;
  undo(paymentId: string): Promise<void>;
  confirm(paymentId: string): Promise<SettleResult>;
  notReceived(paymentId: string): Promise<void>;
};
