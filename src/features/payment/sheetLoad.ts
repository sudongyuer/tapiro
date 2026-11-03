import type { PayeeMethod } from '@/lib/payeeMethods';

import type { Payment, PaymentDetail } from './types';

export type SheetData = { payment: Payment; methods: PayeeMethod[]; detail: PaymentDetail };

export type SheetState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'missing' }
  | ({ status: 'ready'; loadedAt: number; refreshFailed: boolean } & SheetData);

export type SheetAnswer = { status: 'missing' } | ({ status: 'ready' } & SheetData);

export const answeredSheet = (answer: SheetAnswer, at: number): SheetState =>
  answer.status === 'ready' ? { ...answer, loadedAt: at, refreshFailed: false } : answer;

export const failedSheet = (current: SheetState): SheetState =>
  current.status === 'ready' ? { ...current, refreshFailed: true } : { status: 'failed' };
