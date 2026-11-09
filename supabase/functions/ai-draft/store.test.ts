import { describe, expect, test } from 'bun:test';

import { rpcStore } from './store.ts';

function client(result: { data: unknown; error: { message: string } | null }) {
  const calls: [string, Record<string, unknown>][] = [];
  return {
    calls,
    rpc(name: string, args: Record<string, unknown>) {
      calls.push([name, args]);
      return Promise.resolve(result);
    },
  };
}

describe('rpcStore', () => {
  test('finish sends the metering arguments under the names of the SQL function', async () => {
    const fake = client({ data: { energy: 666, energyFull: 1000 }, error: null });
    const after = await rpcStore(fake).finish({
      userId: 'u',
      lease: 'l',
      task: 'answer',
      model: 'fake',
      inputTokens: 1,
      outputTokens: 2,
      energySpent: 3,
    });
    expect(after).toEqual({ energy: 666, energyFull: 1000 });
    expect(fake.calls).toEqual([
      [
        'ai_finish_call',
        {
          uid: 'u',
          held: 'l',
          task: 'answer',
          model: 'fake',
          input_tokens: 1,
          output_tokens: 2,
          energy_spent: 3,
        },
      ],
    ]);
  });

  test('an rpc error throws without quoting the message', async () => {
    const fake = client({ data: null, error: { message: 'failed for 帮我取快递' } });
    await expect(rpcStore(fake).begin('u')).rejects.toThrow('ai_begin_call failed');
    await expect(rpcStore(fake).abort('u', 'l')).rejects.toThrow('ai_abort_call failed');
  });
});
