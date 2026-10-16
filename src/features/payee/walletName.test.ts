import { describe, expect, test } from 'bun:test';
import { methodDetail } from './display';
import { toColumns, toMethod } from './payeeService';

const t = ((key: string, values?: Record<string, string>) =>
  key === 'payee.detail.joined' ? `${values?.first} · ${values?.second}` : key) as never;

describe('wallet receive code names', () => {
  test('the name the wallet shows is stored in the display name column', () => {
    const columns = toColumns({
      type: 'alipay',
      payload: 'https://qr.alipay.com/x',
      displayName: 'LIM',
    });
    expect(columns).toMatchObject({ display_name: 'LIM', qr_payload: 'https://qr.alipay.com/x' });
    expect(columns.qr_name).toBeNull();
  });

  test('a stored wallet row without a name is dropped', () => {
    const row = {
      id: '1',
      type: 'wechat' as const,
      is_default: false,
      created_at: '',
      checked_at: '',
      display_name: null,
      phone: null,
      bank_code: null,
      bank_name: null,
      account_number: null,
      qr_payload: 'wxp://f2f0abc',
      acquirer_id: null,
      mcc: null,
      qr_name: null,
    };
    expect(toMethod(row)).toBeNull();
    expect(toMethod({ ...row, display_name: 'LIM' })).toMatchObject({ displayName: 'LIM' });
  });

  test('the list detail leads with the name', () => {
    expect(methodDetail(t, { type: 'alipay', payload: 'p', displayName: 'LIM' })).toBe(
      'LIM · payee.detail.alipay',
    );
  });
});
