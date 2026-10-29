import { describe, expect, test } from 'bun:test';

import { askThenSend, previewThenSend } from './actionFlow';
import type { ActionResult } from './types';

function counter<T>(answer: ActionResult<T> | null) {
  const calls: number[] = [];
  return {
    calls,
    run: async () => {
      calls.push(calls.length);
      return answer;
    },
  };
}

const ok = <T>(value: T): ActionResult<T> => ({ ok: true, value });
const failed: ActionResult<never> = { ok: false, reason: 'failed' };

describe('askThenSend', () => {
  test('declining the sheet sends nothing', async () => {
    const send = counter(ok(1));
    expect(await askThenSend(async () => false, send.run)).toBeNull();
    expect(send.calls).toHaveLength(0);
  });

  test('a failed send is returned once and never resent', async () => {
    const send = counter(failed);
    expect(await askThenSend(async () => true, send.run)).toEqual(failed);
    expect(send.calls).toHaveLength(1);
  });
});

describe('previewThenSend', () => {
  test('a failed preview opens no sheet and sends nothing', async () => {
    const send = counter(ok('cancelled'));
    const asked: unknown[] = [];
    const result = await previewThenSend(
      async () => failed,
      async (preview) => {
        asked.push(preview);
        return true;
      },
      send.run,
    );
    expect(result).toBeNull();
    expect(asked).toHaveLength(0);
    expect(send.calls).toHaveLength(0);
  });

  test('a locked screen (act answers null) opens no sheet', async () => {
    const asked: unknown[] = [];
    await previewThenSend(
      async () => null,
      async (preview) => asked.push(preview) > 0,
      async () => ok(1),
    );
    expect(asked).toHaveLength(0);
  });

  test('the sheet gets the preview; a failed cancel is not replayed', async () => {
    const send = counter(failed);
    const asked: unknown[] = [];
    const result = await previewThenSend(
      async () => ok({ offender: 'other' }),
      async (preview) => asked.push(preview) > 0,
      send.run,
    );
    expect(asked).toEqual([{ offender: 'other' }]);
    expect(result).toEqual(failed);
    expect(send.calls).toHaveLength(1);
  });
});
