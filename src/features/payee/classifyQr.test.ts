import { describe, expect, test } from 'bun:test';

import { classifyFirst, classifyQr } from './classifyQr';
import { crc16, hasValidCrc, parseTlv, tlv, withCrc } from './emv';

// PayNet P2P example, docs/research/2026-10-06-payee-setup.md §3 (static, with a RM 10.00 amount).
const PAYNET_EXAMPLE =
  '00020201021126410014A000000615000101065016640209123456789520400005303458540510.005802MY5909AUSERNAME6005BANGI63043A23';

function duitNow({
  initiation = '11',
  acquirer = '588734',
  mcc = '0000',
  name = 'LIM WEI JIE',
  amount,
}: {
  initiation?: string;
  acquirer?: string;
  mcc?: string;
  name?: string;
  amount?: string;
} = {}) {
  const account = tlv('00', 'A0000006150001') + tlv('01', acquirer) + tlv('02', '123456789');
  return withCrc(
    tlv('00', '02') +
      tlv('01', initiation) +
      tlv('26', account) +
      tlv('52', mcc) +
      tlv('53', '458') +
      (amount ? tlv('54', amount) : '') +
      tlv('58', 'MY') +
      tlv('59', name) +
      tlv('60', 'BANGI'),
  );
}

describe('emv', () => {
  test('CRC-16/CCITT-FALSE matches the PayNet example', () => {
    expect(crc16(PAYNET_EXAMPLE.slice(0, -4))).toBe('3A23');
    expect(hasValidCrc(PAYNET_EXAMPLE)).toBe(true);
  });

  test('CRC-16/CCITT-FALSE check value', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  test('parses top-level tags', () => {
    const fields = parseTlv(PAYNET_EXAMPLE);
    expect(fields?.get('59')).toBe('AUSERNAME');
    expect(fields?.get('52')).toBe('0000');
  });

  test('rejects a truncated field', () => {
    expect(parseTlv('5909AUSER')).toBeNull();
  });
});

describe('classifyQr', () => {
  test('accepts a static personal DuitNow QR with bank and name', () => {
    const payload = duitNow();
    expect(classifyQr(payload)).toEqual({
      ok: true,
      qr: {
        type: 'duitnow_qr',
        payload,
        acquirerId: '588734',
        mcc: '0000',
        name: 'LIM WEI JIE',
        business: false,
      },
    });
  });

  test('accepts a TNG code and keeps the string unchanged', () => {
    const payload = duitNow({ acquirer: '890053' });
    const result = classifyQr(`  ${payload}\n`);
    expect(result.ok && result.qr).toMatchObject({ acquirerId: '890053', payload });
  });

  test('rejects a code with one changed character as damaged', () => {
    const payload = duitNow().replace('LIM WEI JIE', 'LIM WEI JIF');
    expect(classifyQr(payload)).toEqual({ ok: false, reason: 'badCrc' });
  });

  test('rejects a dynamic code', () => {
    expect(classifyQr(duitNow({ initiation: '12', amount: '15.00' }))).toEqual({
      ok: false,
      reason: 'dynamic',
    });
  });

  test('rejects a static code that carries an amount (the PayNet example)', () => {
    expect(classifyQr(PAYNET_EXAMPLE)).toEqual({ ok: false, reason: 'hasAmount' });
  });

  test('allows a business code and labels it', () => {
    const result = classifyQr(duitNow({ mcc: '5814' }));
    expect(result.ok && result.qr).toMatchObject({ type: 'duitnow_qr', business: true });
  });

  test('keeps an unknown acquirer', () => {
    const result = classifyQr(duitNow({ acquirer: '501664' }));
    expect(result.ok && result.qr).toMatchObject({ acquirerId: '501664' });
  });

  test('rejects an EMV code from another network', () => {
    const account = tlv('00', 'A000000677010111') + tlv('01', '0066812345678');
    const payload = withCrc(
      tlv('00', '01') + tlv('01', '11') + tlv('29', account) + tlv('53', '764') + tlv('58', 'TH'),
    );
    expect(classifyQr(payload)).toEqual({ ok: false, reason: 'unknown' });
  });

  test.each([
    ['https://qr.alipay.com/fkx12345abcdefghijkl', 'alipay'],
    ['HTTPS://QR.ALIPAY.COM/FKX12345ABCDEFGHIJKL', 'alipay'],
    ['wxp://f2f0abcdEFGHijklMNOPqrstUVWXyz012345', 'wechat'],
    ['weixin://wxpay/bizpayurl/up?pr=NwY5Mz9&groupid=00', 'wechat'],
  ])('accepts the wallet URL %s', (payload, type) => {
    expect(classifyQr(payload)).toEqual({ ok: true, qr: { type, payload } as never });
  });

  test('does not accept a look-alike Alipay host', () => {
    expect(classifyQr('https://qr.alipay.com.example.com/x')).toEqual({
      ok: false,
      reason: 'unknown',
    });
  });

  test.each([
    ['Alipay 18 digits from 28', '284567890123456789'],
    ['Alipay 16 digits from 25', '2512345678901234'],
    ['Alipay 24 digits from 30', '301234567890123456789012'],
    ['WeChat 18 digits from 13', '134567890123456789'],
    ['WeChat 18 digits from 10', '101234567890123456'],
    ['DuitNow consumer-presented', 'hQVDUFYwMWFNTwegAAAGFQABUAdEdWl0Tm93'],
  ])('blocks a paying code (%s)', (_, payload) => {
    expect(classifyQr(payload)).toEqual({ ok: false, reason: 'payingCode' });
  });

  test('other digit strings are unknown, not paying codes', () => {
    expect(classifyQr('0123456789012345')).toEqual({ ok: false, reason: 'unknown' });
    expect(classifyQr('161234567890123456')).toEqual({ ok: false, reason: 'unknown' });
  });

  test.each([
    ['random text', 'hello there'],
    ['a web link', 'https://tapiro.app/'],
  ])('rejects %s as unknown', (_, payload) => {
    expect(classifyQr(payload)).toEqual({ ok: false, reason: 'unknown' });
  });

  test('empty means no code', () => {
    expect(classifyQr('   ')).toEqual({ ok: false, reason: 'noCode' });
    expect(classifyFirst([])).toEqual({ ok: false, reason: 'noCode' });
  });

  test('picks the receive code when a screenshot holds several codes', () => {
    const payload = duitNow();
    const result = classifyFirst(['134567890123456789', payload]);
    expect(result.ok && result.qr.payload).toBe(payload);
  });

  test('reports the first rejection when nothing is accepted', () => {
    expect(classifyFirst(['134567890123456789', 'hello'])).toEqual({
      ok: false,
      reason: 'payingCode',
    });
  });
});
