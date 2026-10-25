import type { SupabaseClient } from '@supabase/supabase-js';

import { toMethod, type PayeeMethodRow } from '@/lib/payeeMethods';

import type { PayeeDetails, PayeeMethod } from './methods';

export { toMethod };

export type PayeeService = {
  list(): Promise<PayeeMethod[]>;
  add(details: PayeeDetails): Promise<void>;
  update(id: string, details: PayeeDetails): Promise<void>;
  replaceQr(id: string, details: PayeeDetails): Promise<void>;
  remove(id: string): Promise<void>;
  setDefault(id: string): Promise<void>;
};

type Row = PayeeMethodRow;

type Columns = Omit<Row, 'id' | 'is_default' | 'created_at' | 'checked_at'>;

const EMPTY: Omit<Columns, 'type'> = {
  display_name: null,
  phone: null,
  bank_code: null,
  bank_name: null,
  account_number: null,
  qr_payload: null,
  acquirer_id: null,
  mcc: null,
  qr_name: null,
};

export function toColumns(details: PayeeDetails): Columns {
  switch (details.type) {
    case 'duitnow_id':
      return {
        ...EMPTY,
        type: details.type,
        phone: details.phone,
        display_name: details.displayName,
      };
    case 'bank_account':
      return {
        ...EMPTY,
        type: details.type,
        bank_code: details.bankCode,
        bank_name: details.bankName,
        account_number: details.accountNumber,
        display_name: details.displayName,
      };
    case 'duitnow_qr':
      return {
        ...EMPTY,
        type: details.type,
        qr_payload: details.payload,
        acquirer_id: details.acquirerId,
        mcc: details.mcc,
        qr_name: details.name,
      };
    case 'alipay':
    case 'wechat':
      return {
        ...EMPTY,
        type: details.type,
        qr_payload: details.payload,
        display_name: details.displayName,
      };
    case 'cash':
      return { ...EMPTY, type: details.type };
  }
}

function unwrap<T extends { error: unknown }>(result: T) {
  if (result.error) throw result.error;
  return result;
}

export function createSupabasePayeeService(client: SupabaseClient | null): PayeeService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  return {
    async list() {
      const { data } = unwrap(
        await db().from('payee_methods').select('*').order('created_at').returns<Row[]>(),
      );
      return (data ?? []).flatMap((row) => toMethod(row) ?? []);
    },
    async add(details) {
      unwrap(await db().from('payee_methods').insert(toColumns(details)));
    },
    async update(id, details) {
      const { type: _type, ...columns } = toColumns(details);
      const checked =
        details.type === 'duitnow_qr' || details.type === 'alipay' || details.type === 'wechat';
      const values = checked ? { ...columns, checked_at: new Date().toISOString() } : columns;
      const { data } = unwrap(
        await db().from('payee_methods').update(values).eq('id', id).select('id'),
      );
      if (!data?.length) throw new Error('payee method not found');
    },
    async replaceQr(id, details) {
      const columns = toColumns(details);
      unwrap(
        await db().rpc('replace_payee_qr', {
          method_id: id,
          new_type: columns.type,
          new_payload: columns.qr_payload,
          new_acquirer_id: columns.acquirer_id,
          new_mcc: columns.mcc,
          new_qr_name: columns.qr_name,
          new_display_name: columns.display_name,
        }),
      );
    },
    async remove(id) {
      const { data } = unwrap(await db().from('payee_methods').delete().eq('id', id).select('id'));
      if (!data?.length) throw new Error('payee method not found');
    },
    async setDefault(id) {
      unwrap(await db().rpc('set_default_payee_method', { method_id: id }));
    },
  };
}
