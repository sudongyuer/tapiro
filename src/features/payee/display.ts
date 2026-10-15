import type { TFunction } from 'i18next';
import type { SFSymbol } from 'sf-symbols-typescript';

import { acquirerName } from './acquirers';
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

export function methodTitle(t: TFunction, method: PayeeDetails) {
  if (method.type === 'duitnow_qr') {
    const bank = acquirerName(method.acquirerId);
    return bank ? t('payee.types.duitnow_qr', { bank }) : t('payee.types.duitnow_qr_generic');
  }
  if (method.type === 'bank_account')
    return acquirerName(method.bankCode) ?? t('payee.types.bank_account');
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
      return method.mcc === '0000'
        ? joined(method.name, acquirerName(method.acquirerId) ?? 'DuitNow')
        : joined(method.name, t('payee.detail.business'));
    case 'alipay':
    case 'wechat':
      return t(`payee.detail.${method.type}`);
    case 'cash':
      return '';
  }
}

export function qrBank(qr: Extract<ClassifiedQr, { type: 'duitnow_qr' }>) {
  return acquirerName(qr.acquirerId) ?? 'DuitNow';
}
