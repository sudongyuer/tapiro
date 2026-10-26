import { acquirerName, TNG_ACQUIRER } from '@/lib/acquirers';
import { formatMalaysianMobile, type PayeeMethod } from '@/lib/payeeMethods';

export type WalletApp = 'alipay' | 'wechat' | 'tng';

export type PayOption =
  | {
      kind: 'qr';
      id: string;
      type: 'alipay' | 'wechat' | 'duitnow_qr';
      app: WalletApp | null;
      bank: string | null;
      payload: string;
      payeeName: string;
    }
  | {
      kind: 'transfer';
      id: string;
      type: 'duitnow_id' | 'bank_account';
      bank: string | null;
      display: string;
      copyValue: string;
      payeeName: string;
    }
  | { kind: 'cash'; id: string; type: 'cash' };

// Links an app opens to its home screen. Each stays unconfirmed until it is opened on a device
// (foundation spec, Known limits); an unconfirmed link is never used.
export const WALLET_LINKS: Record<WalletApp, { url: string; confirmed: boolean }> = {
  alipay: { url: 'alipays://', confirmed: false },
  wechat: { url: 'weixin://', confirmed: false },
  tng: { url: 'tngdwallet://', confirmed: false },
};

export function confirmedLink(app: WalletApp | null) {
  if (!app) return null;
  const link = WALLET_LINKS[app];
  return link.confirmed ? link.url : null;
}

const RANK: Record<string, number> = {
  alipay: 0,
  wechat: 1,
  tng: 2,
  duitnow_qr: 3,
  duitnow_id: 4,
  bank_account: 5,
  cash: 6,
};

const rankOf = (method: PayeeMethod) =>
  method.type === 'duitnow_qr' && method.acquirerId === TNG_ACQUIRER ? RANK.tng : RANK[method.type];

export function toOption(method: PayeeMethod): PayOption {
  switch (method.type) {
    case 'alipay':
    case 'wechat':
      return {
        kind: 'qr',
        id: method.id,
        type: method.type,
        app: method.type,
        bank: null,
        payload: method.payload,
        payeeName: method.displayName,
      };
    case 'duitnow_qr': {
      const tng = method.acquirerId === TNG_ACQUIRER;
      return {
        kind: 'qr',
        id: method.id,
        type: method.type,
        app: tng ? 'tng' : null,
        bank: tng ? null : acquirerName(method.acquirerId),
        payload: method.payload,
        payeeName: method.name,
      };
    }
    case 'duitnow_id':
      return {
        kind: 'transfer',
        id: method.id,
        type: method.type,
        bank: null,
        display: formatMalaysianMobile(method.phone),
        copyValue: method.phone.replace(/^\+60/, '0'),
        payeeName: method.displayName,
      };
    case 'bank_account':
      return {
        kind: 'transfer',
        id: method.id,
        type: method.type,
        bank: acquirerName(method.bankCode) ?? method.bankName,
        display: method.accountNumber,
        copyValue: method.accountNumber,
        payeeName: method.displayName,
      };
    case 'cash':
      return { kind: 'cash', id: method.id, type: 'cash' };
  }
}

export function payOptions(methods: readonly PayeeMethod[]) {
  return [...methods]
    .sort(
      (a, b) =>
        rankOf(a) - rankOf(b) ||
        Number(b.isDefault) - Number(a.isDefault) ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .map(toOption);
}

export function initialSelection(options: readonly PayOption[]) {
  return options.length === 1 ? options[0].id : null;
}

export const takesCash = (methods: readonly PayeeMethod[]) =>
  methods.some((method) => method.type === 'cash');
