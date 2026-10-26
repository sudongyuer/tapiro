import type { SupabaseClient } from '@supabase/supabase-js';

import { toMethod, type PayeeMethodRow, type PayeeType } from '@/lib/payeeMethods';

import type { Payment, PaymentService, PaymentState } from './types';

export const PROOF_BUCKET = 'payment-proofs';

export type PaymentRow = {
  id: string;
  item_kind: 'bounty' | 'ride';
  title: string;
  amount_sen: number;
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
  if (!role) return null;
  const counterpartId = role === 'payer' ? row.payee_id : row.payer_id;
  return {
    id: row.id,
    itemKind: row.item_kind,
    title: row.title,
    amountSen: row.amount_sen,
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
  'id, item_kind, title, amount_sen, reference, state, payer_id, payee_id, method_type, proof_path, nudged_at, marked_paid_at, created_at, reverses';

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
    async latestRate() {
      const { data } = unwrap(
        await db()
          .from('fx_rates')
          .select('rate_date, rm_per_cny')
          .order('rate_date', { ascending: false })
          .limit(1),
      );
      const row = data?.[0];
      return row ? { rateDate: row.rate_date, rmPerCny: Number(row.rm_per_cny) } : null;
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
      await rpc('mark_payment_paid', { payment: paymentId, method: methodId, proof: proofPath });
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
          typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : 0,
      };
    },
    async notReceived(paymentId) {
      await rpc('report_not_received', { payment: paymentId });
    },
  };
}
