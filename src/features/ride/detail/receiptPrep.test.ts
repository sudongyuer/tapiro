import { describe, expect, test } from 'bun:test';

import { prepareReceipt } from './receiptPrep';
import { emptySplit, type SplitDraft } from './splitDraft';

const uploaded: SplitDraft = {
  ...emptySplit(),
  totalText: '74',
  receipt: { status: 'uploaded', uri: 'file:///r.jpg', path: 'ride/1.jpg' },
};

function service(exists: boolean) {
  const uploads: string[] = [];
  return {
    uploads,
    uploadReceipt: async (_id: string, uri: string) => {
      uploads.push(uri);
      return 'ride/2.jpg';
    },
    receiptExists: async () => exists,
  };
}

describe('the receipt on a retried split (212 B)', () => {
  test('an uploaded receipt that still exists is reused, not uploaded again', async () => {
    const fake = service(true);
    expect(await prepareReceipt('ride', uploaded, fake)).toEqual({
      ok: true,
      path: 'ride/1.jpg',
      draft: uploaded,
    });
    expect(fake.uploads).toEqual([]);
  });

  test('a receipt the cleanup removed is dropped and reported, never re-uploaded by itself', async () => {
    const fake = service(false);
    const prepared = await prepareReceipt('ride', uploaded, fake);
    expect(prepared).toEqual({
      ok: false,
      reason: 'receiptExpired',
      draft: { ...uploaded, receipt: { status: 'expired' } },
    });
    expect(fake.uploads).toEqual([]);
  });

  test('a picked receipt uploads once; a failed upload keeps the file for the user to retry', async () => {
    const fake = service(true);
    const picked: SplitDraft = { ...uploaded, receipt: { status: 'picked', uri: 'file:///r.jpg' } };
    const prepared = await prepareReceipt('ride', picked, fake);
    expect(prepared.ok && prepared.path).toBe('ride/2.jpg');
    const failing = {
      ...fake,
      uploadReceipt: async () => Promise.reject(new Error('offline')),
    };
    expect((await prepareReceipt('ride', picked, failing)).draft.receipt).toEqual({
      status: 'failed',
      uri: 'file:///r.jpg',
    });
  });
});
