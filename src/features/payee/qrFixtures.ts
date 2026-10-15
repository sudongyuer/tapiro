import { tlv, withCrc } from './emv';

function duitNow(acquirerId: string, name: string, initiation = '11') {
  const account = tlv('00', 'A0000006150001') + tlv('01', acquirerId) + tlv('02', '0123456789');
  return withCrc(
    tlv('00', '02') +
      tlv('01', initiation) +
      tlv('26', account) +
      tlv('52', '0000') +
      tlv('53', '458') +
      tlv('58', 'MY') +
      tlv('59', name) +
      tlv('60', 'KUALA LUMPUR'),
  );
}

const tng = duitNow('890053', 'LIM WEI JIE');

export const FIXTURE_QR = {
  tngDetails: { payload: tng, acquirerId: '890053', mcc: '0000', name: 'LIM WEI JIE' },
  scans: {
    duitnow: [duitNow('588734', 'TAN MEI LING')],
    paying: ['284567890123456789'],
    dynamic: [duitNow('588734', 'TAN MEI LING', '12')],
    alipay: ['https://qr.alipay.com/fkx12345abcdefghijkl'],
    none: [],
  } as Record<string, string[]>,
};
