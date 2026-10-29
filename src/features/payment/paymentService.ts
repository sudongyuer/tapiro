import type { SupabaseClient } from '@supabase/supabase-js';

import { isCurrencyCode, toMoney } from '@/lib/money';
import { PAYEE_TYPES, toMethod, type PayeeMethodRow, type PayeeType } from '@/lib/payeeMethods';
import { bountyCategory } from '@/lib/stickers/category';

import {
  NoRateError,
  type FxRate,
  type MethodAmount,
  type Payment,
  type PaymentDetail,
  type PaymentService,
  type PaymentState,
} from './types';

export const PROOF_BUCKET = 'payment-proofs';

export type PaymentRow = {
  id: string;
  item_kind: 'bounty' | 'ride';
  category: string | null;
  title: string;
  amount_minor: number;
  currency: string;
  paid_minor: number | null;
  paid_currency: string | null;
  reference: string;
  state: PaymentState;
  payer_id: string | null;
  payee_id: string | null;
  method_type: PayeeType | null;
  proof_path: string | null;
  nudged_at: string | null;
  marked_paid_at: string | null;
  created_at: string;
  reverses: string | null;
};

export function toPayment(
  userId: string,
  row: PaymentRow,
  names: Readonly<Record<string, string>>,
): Payment | null {
  const role = row.payer_id === userId ? 'payer' : row.payee_id === userId ? 'payee' : null;
  const amount = toMoney(row.amount_minor, row.currency);
  if (!role || !amount) return null;
  const paid = row.paid_minor === null ? null : toMoney(row.paid_minor, row.paid_currency);
  const counterpartId = role === 'payer' ? row.payee_id : row.payer_id;
  return {
    id: row.id,
    itemKind: row.item_kind,
    category: bountyCategory(row.category),
    title: row.title,
    amount,
    paid,
    reference: row.reference,
    state: row.state,
    role,
    counterpartId,
    counterpartName: (counterpartId && names[counterpartId]) || '',
    methodType: row.method_type,
    proofPath: row.proof_path,
    nudgedAt: row.nudged_at,
    markedPaidAt: row.marked_paid_at,
    createdAt: row.created_at,
    reverses: row.reverses,
  };
}

function unwrap<T extends { error: unknown }>(result: T) {
  if (result.error) throw result.error;
  return result;
}

const COLUMNS =
  'id, item_kind, category, title, amount_minor, currency, paid_minor, paid_currency, reference, state, payer_id, payee_id, method_type, proof_path, nudged_at, marked_paid_at, created_at, reverses';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toLockedRate(value: unknown): FxRate | null | undefined {
  if (value === null) return null;
  if (!isObject(value)) return undefined;
  const quotePerBase = Number(value.quotePerBase);
  const { base, quote, date, source } = value;
  if (!isCurrencyCode(base) || !isCurrencyCode(quote) || !(quotePerBase > 0)) return undefined;
  if (typeof date !== 'string' || typeof source !== 'string') return undefined;
  return { base, quote, quotePerBase, rateDate: date, source };
}

function toMethodAmount(value: unknown): MethodAmount | null {
  if (!isObject(value)) return null;
  const { method, type, currency, amountMinor } = value;
  if (typeof method !== 'string' || !isCurrencyCode(currency)) return null;
  if (!PAYEE_TYPES.includes(type as PayeeType)) return null;
  const amount = amountMinor === null ? null : toMoney(amountMinor, currency);
  if (amountMinor !== null && !amount) return null;
  return { methodId: method, type: type as PayeeType, currency, amount };
}

export function toPaymentDetail(value: unknown): PaymentDetail | null {
  if (!isObject(value) || !Array.isArray(value.methods)) return null;
  const rate = toLockedRate(value.rate ?? null);
  if (rate === undefined) return null;
  const methods = value.methods.map(toMethodAmount);
  return methods.every((method) => method !== null) ? { rate, methods } : null;
}

const isNoRate = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === '55000' &&
  (error as { message?: unknown }).message === 'no_rate';

export type ReadFile = (uri: string) => Promise<ArrayBuffer>;

const fetchBytes: ReadFile = async (uri) => (await fetch(uri)).arrayBuffer();

export function createSupabasePaymentService(
  client: SupabaseClient | null,
  readFile: ReadFile = fetchBytes,
): PaymentService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };

  async function names(userId: string, rows: readonly PaymentRow[]) {
    const ids = [...new Set(rows.flatMap((row) => [row.payer_id, row.payee_id]))].filter(
      (id): id is string => id !== null && id !== userId,
    );
    const result: Record<string, string> = {};
    if (ids.length === 0) return result;
    const { data } = unwrap(await db().from('profiles').select('id, display_name').in('id', ids));
    for (const profile of data ?? []) result[profile.id] = profile.display_name;
    return result;
  }

  async function rpc(name: string, args: Record<string, unknown>) {
    return unwrap(await db().rpc(name, args)).data as unknown;
  }

  return {
    async list(userId) {
      const { data } = unwrap(
        await db()
          .from('payments')
          .select(COLUMNS)
          .neq('state', 'settled')
          .order('created_at')
          .returns<PaymentRow[]>(),
      );
      const rows = data ?? [];
      const known = await names(userId, rows);
      return rows.flatMap((row) => toPayment(userId, row, known) ?? []);
    },
    async get(userId, id) {
      const { data } = unwrap(
        await db().from('payments').select(COLUMNS).eq('id', id).returns<PaymentRow[]>(),
      );
      const row = data?.[0];
      if (!row) return null;
      return toPayment(userId, row, await names(userId, [row]));
    },
    async methodsOf(userId) {
      const { data } = unwrap(
        await db()
          .from('payee_methods')
          .select('*')
          .eq('user_id', userId)
          .order('created_at')
          .returns<PayeeMethodRow[]>(),
      );
      return (data ?? []).flatMap((row) => toMethod(row) ?? []);
    },
    async detail(paymentId) {
      const detail = toPaymentDetail(await rpc('payment_detail', { payment: paymentId }));
      if (!detail) throw new Error('unreadable payment detail');
      return detail;
    },
    async uploadProof(paymentId, fileUri) {
      const extension = /\.png$/i.test(fileUri) ? 'png' : 'jpg';
      const path = `${paymentId}/${Date.now()}.${extension}`;
      const body = await readFile(fileUri);
      unwrap(
        await db()
          .storage.from(PROOF_BUCKET)
          .upload(path, body, { contentType: extension === 'png' ? 'image/png' : 'image/jpeg' }),
      );
      return path;
    },
    async removeProof(path) {
      unwrap(await db().storage.from(PROOF_BUCKET).remove([path]));
    },
    async proofUrl(path) {
      const { data } = unwrap(await db().storage.from(PROOF_BUCKET).createSignedUrl(path, 300));
      if (!data?.signedUrl) throw new Error('no signed url');
      return data.signedUrl;
    },
    async markPaid(paymentId, methodId, proofPath) {
      const { error } = await db().rpc('mark_payment_paid', {
        payment: paymentId,
        method: methodId,
        proof: proofPath,
      });
      if (isNoRate(error)) throw new NoRateError();
      if (error) throw error;
    },
    async undo(paymentId) {
      await rpc('undo_marked_paid', { payment: paymentId });
    },
    async confirm(paymentId) {
      const data = (await rpc('confirm_payment_received', { payment: paymentId })) as {
        firstSettled?: unknown;
        stickerCount?: unknown;
      } | null;
      const count = data?.stickerCount;
      return {
        firstSettled: data?.firstSettled === true,
        stickerCount:
          typeof count === 'number' && Number.isInteger(count) && count > 0 ? count : null,
      };
    },
    async notReceived(paymentId) {
      await rpc('report_not_received', { payment: paymentId });
    },
  };
}
