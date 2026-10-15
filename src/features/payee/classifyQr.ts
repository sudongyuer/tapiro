import { hasValidCrc, parseTlv } from './emv';

export const DUITNOW_AID = 'A0000006150001';

export type QrRejection = 'noCode' | 'payingCode' | 'badCrc' | 'dynamic' | 'hasAmount' | 'unknown';

export type ClassifiedQr =
  | {
      type: 'duitnow_qr';
      payload: string;
      acquirerId: string;
      mcc: string;
      name: string;
      business: boolean;
    }
  | { type: 'alipay' | 'wechat'; payload: string };

export type QrClassification = { ok: true; qr: ClassifiedQr } | { ok: false; reason: QrRejection };

const reject = (reason: QrRejection): QrClassification => ({ ok: false, reason });

// Formats: docs/research/2026-10-06-payee-setup.md §1 "Paying codes" (Alipay 16–24 digits from 25–30,
// WeChat 18 digits from 10–15). "hQVDUFYw" is base64 of the EMV consumer-presented header 85 05 "CPV01".
function isPayingCode(text: string) {
  if (/^(2[5-9]|30)\d{14,22}$/.test(text)) return true;
  if (/^1[0-5]\d{16}$/.test(text)) return true;
  return text.startsWith('hQVDUFYw');
}

function walletUrl(text: string): 'alipay' | 'wechat' | null {
  if (/^wxp:\/\/\S+$/i.test(text)) return 'wechat';
  if (/^weixin:\/\/wxpay\/\S+$/i.test(text)) return 'wechat';
  const match = text.match(/^https?:\/\/([^/?#]+)\/\S+$/i);
  if (match && match[1].toLowerCase() === 'qr.alipay.com') return 'alipay';
  return null;
}

function duitNowAccount(fields: Map<string, string>) {
  for (let tag = 26; tag <= 51; tag++) {
    const template = fields.get(String(tag));
    const sub = template ? parseTlv(template) : null;
    if (sub?.get('00')?.toUpperCase() === DUITNOW_AID) return sub;
  }
  return null;
}

function classifyEmv(payload: string): QrClassification {
  if (!hasValidCrc(payload)) return reject('badCrc');
  const fields = parseTlv(payload);
  if (!fields) return reject('badCrc');
  const account = duitNowAccount(fields);
  if (!account) return reject('unknown');
  if (fields.get('01') === '12') return reject('dynamic');
  if (fields.has('54')) return reject('hasAmount');
  const acquirerId = account.get('01');
  const mcc = fields.get('52');
  const name = fields.get('59')?.trim();
  if (fields.get('53') !== '458' || fields.get('58') !== 'MY') return reject('unknown');
  if (!acquirerId || !mcc || !name) return reject('unknown');
  return {
    ok: true,
    qr: { type: 'duitnow_qr', payload, acquirerId, mcc, name, business: mcc !== '0000' },
  };
}

export function classifyQr(raw: string): QrClassification {
  const text = raw.trim();
  if (text === '') return reject('noCode');
  if (isPayingCode(text)) return reject('payingCode');
  if (/^0002\d{2}/.test(text)) return classifyEmv(text);
  const wallet = walletUrl(text);
  if (wallet) return { ok: true, qr: { type: wallet, payload: text } };
  return reject('unknown');
}

export function classifyFirst(payloads: string[]): QrClassification {
  if (payloads.length === 0) return reject('noCode');
  const results = payloads.map(classifyQr);
  return results.find((result) => result.ok) ?? results[0];
}
