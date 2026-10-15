import type { SupabaseClient } from '@supabase/supabase-js';

import type { PayeeDetails, PayeeMethod, PayeeType } from './methods';

export type PayeeService = {
  list(): Promise<PayeeMethod[]>;
  add(details: PayeeDetails): Promise<void>;
  update(id: string, details: PayeeDetails): Promise<void>;
  remove(id: string): Promise<void>;
  setDefault(id: string): Promise<void>;
};

type Row = {
  id: string;
  type: PayeeType;
  is_default: boolean;
  created_at: string;
  checked_at: string;
  display_name: string | null;
  phone: string | null;
  bank_code: string | null;
  account_number: string | null;
  qr_payload: string | null;
  acquirer_id: string | null;
  mcc: string | null;
  qr_name: string | null;
};

type Columns = Omit<Row, 'id' | 'is_default' | 'created_at' | 'checked_at'>;

const EMPTY: Omit<Columns, 'type'> = {
  display_name: null,
  phone: null,
  bank_code: null,
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
      return { ...EMPTY, type: details.type, qr_payload: details.payload };
    case 'cash':
      return { ...EMPTY, type: details.type };
  }
}

function toDetails(row: Row): PayeeDetails | null {
  switch (row.type) {
    case 'duitnow_id':
      return row.phone && row.display_name
        ? { type: row.type, phone: row.phone, displayName: row.display_name }
        : null;
    case 'bank_account':
      return row.bank_code && row.account_number && row.display_name
        ? {
            type: row.type,
            bankCode: row.bank_code,
            accountNumber: row.account_number,
            displayName: row.display_name,
          }
        : null;
    case 'duitnow_qr':
      return row.qr_payload && row.acquirer_id && row.mcc && row.qr_name
        ? {
            type: row.type,
            payload: row.qr_payload,
            acquirerId: row.acquirer_id,
            mcc: row.mcc,
            name: row.qr_name,
          }
        : null;
    case 'alipay':
    case 'wechat':
      return row.qr_payload ? { type: row.type, payload: row.qr_payload } : null;
    case 'cash':
      return { type: row.type };
  }
}

export function toMethod(row: Row): PayeeMethod | null {
  const details = toDetails(row);
  if (!details) return null;
  return {
    ...details,
    id: row.id,
    isDefault: row.is_default,
    createdAt: row.created_at,
    checkedAt: row.checked_at,
  };
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
      unwrap(await db().from('payee_methods').update(columns).eq('id', id));
    },
    async remove(id) {
      unwrap(await db().from('payee_methods').delete().eq('id', id));
    },
    async setDefault(id) {
      unwrap(await db().rpc('set_default_payee_method', { method_id: id }));
    },
  };
}
