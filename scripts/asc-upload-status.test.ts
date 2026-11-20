import { describe, expect, test } from 'bun:test';

import { describeUpload, findUpload } from './asc-upload-status.mjs';

const upload = (
  build: string,
  state: string,
  errors: { code: string; description: string }[] = [],
) => ({
  attributes: {
    cfBundleShortVersionString: '1.0.0',
    cfBundleVersion: build,
    state: { state, errors },
  },
});

describe('asc upload status', () => {
  test('a failed upload is done, not ok, and names Apple’s error', () => {
    const failed = upload('20261120.1136', 'FAILED', [
      { code: '90683', description: 'Missing purpose string in Info.plist.' },
    ]);
    expect(describeUpload(findUpload([failed], '1.0.0', '20261120.1136'))).toEqual({
      done: true,
      ok: false,
      lines: ['state FAILED', 'error 90683: Missing purpose string in Info.plist.'],
    });
  });

  test('a processing upload is not done; a complete one is ok', () => {
    expect(describeUpload(upload('2', 'PROCESSING')).done).toBe(false);
    expect(describeUpload(upload('2', 'COMPLETE'))).toMatchObject({ done: true, ok: true });
  });

  test('another build number is not this upload', () => {
    expect(findUpload([upload('1', 'COMPLETE')], '1.0.0', '2')).toBeUndefined();
    expect(describeUpload(undefined).done).toBe(false);
  });
});
