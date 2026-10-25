export const PAYEE_TYPES = [
  'duitnow_id',
  'bank_account',
  'duitnow_qr',
  'alipay',
  'wechat',
  'cash',
] as const;
export type PayeeType = (typeof PAYEE_TYPES)[number];

export type PayeeDetails =
  | { type: 'duitnow_id'; phone: string; displayName: string }
  | {
      type: 'bank_account';
      bankCode: string | null;
      bankName: string | null;
      accountNumber: string;
      displayName: string;
    }
  | { type: 'duitnow_qr'; payload: string; acquirerId: string; mcc: string; name: string }
  | { type: 'alipay' | 'wechat'; payload: string; displayName: string }
  | { type: 'cash' };

export type PayeeMethod = PayeeDetails & {
  id: string;
  isDefault: boolean;
  createdAt: string;
  checkedAt: string;
};

export type PayeeMethodRow = {
  id: string;
  type: PayeeType;
  is_default: boolean;
  created_at: string;
  checked_at: string;
  display_name: string | null;
  phone: string | null;
  bank_code: string | null;
  bank_name: string | null;
  account_number: string | null;
  qr_payload: string | null;
  acquirer_id: string | null;
  mcc: string | null;
  qr_name: string | null;
};

function toDetails(row: PayeeMethodRow): PayeeDetails | null {
  switch (row.type) {
    case 'duitnow_id':
      return row.phone && row.display_name
        ? { type: row.type, phone: row.phone, displayName: row.display_name }
        : null;
    case 'bank_account':
      return (row.bank_code || row.bank_name) && row.account_number && row.display_name
        ? {
            type: row.type,
            bankCode: row.bank_code,
            bankName: row.bank_name,
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
      return row.qr_payload && row.display_name
        ? { type: row.type, payload: row.qr_payload, displayName: row.display_name }
        : null;
    case 'cash':
      return { type: row.type };
  }
}

export function toMethod(row: PayeeMethodRow): PayeeMethod | null {
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

export function formatMalaysianMobile(e164: string) {
  const national = e164.replace(/^\+60/, '');
  if (!/^1\d{8,9}$/.test(national)) return e164;
  const head = national.slice(0, 2);
  const rest = national.slice(2);
  const split = rest.length === 8 ? 4 : 3;
  return `+60 ${head}-${rest.slice(0, split)} ${rest.slice(split)}`;
}
