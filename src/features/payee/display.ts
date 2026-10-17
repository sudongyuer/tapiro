import type { TFunction } from 'i18next';
import type { SFSymbol } from 'sf-symbols-typescript';

import { acquirerName, TNG_ACQUIRER } from './acquirers';
import type { ClassifiedQr } from './classifyQr';
import type { PayeeDetails } from './methods';
import { formatMalaysianMobile, maskAccountNumber } from './validate';

export const METHOD_ICONS: Record<PayeeDetails['type'], SFSymbol> = {
  duitnow_id: 'phone.fill',
  bank_account: 'building.columns.fill',
  duitnow_qr: 'qrcode',
  alipay: 'qrcode',
  wechat: 'qrcode',
  cash: 'banknote.fill',
};

export function methodTitle(t: TFunction, method: PayeeDetails | ClassifiedQr) {
  if (method.type === 'duitnow_qr') {
    if (method.acquirerId === TNG_ACQUIRER) return t('payee.types.tng');
    const bank = acquirerName(method.acquirerId);
    return bank ? t('payee.types.duitnow_qr', { bank }) : t('payee.types.duitnow_qr_generic');
  }
  if (method.type === 'bank_account')
    return acquirerName(method.bankCode) ?? method.bankName ?? t('payee.types.bank_account');
  return t(`payee.types.${method.type}`);
}

export function methodDetail(t: TFunction, method: PayeeDetails) {
  const joined = (first: string, second: string) => t('payee.detail.joined', { first, second });
  switch (method.type) {
    case 'duitnow_id':
      return joined(formatMalaysianMobile(method.phone), method.displayName);
    case 'bank_account':
      return joined(maskAccountNumber(method.accountNumber), method.displayName);
    case 'duitnow_qr':
      return method.mcc === '0000' ? method.name : joined(method.name, t('payee.detail.business'));
    case 'alipay':
    case 'wechat':
      return joined(method.displayName, t(`payee.detail.${method.type}`));
    case 'cash':
      return '';
  }
}

export function qrBank(qr: Extract<ClassifiedQr, { type: 'duitnow_qr' }>) {
  return acquirerName(qr.acquirerId) ?? 'DuitNow';
}

export type QrWallet = 'alipay' | 'wechat' | 'tng';

export const isQrWallet = (value: string | undefined): value is QrWallet =>
  value === 'alipay' || value === 'wechat' || value === 'tng';

export function walletOf(qr: ClassifiedQr): QrWallet | 'duitnow' {
  if (qr.type === 'duitnow_qr') return qr.acquirerId === TNG_ACQUIRER ? 'tng' : 'duitnow';
  return qr.type;
}

export function walletName(t: TFunction, qr: ClassifiedQr) {
  return qr.type === 'duitnow_qr' ? qrBank(qr) : t(`payee.qr.wallet.${qr.type}`);
}
