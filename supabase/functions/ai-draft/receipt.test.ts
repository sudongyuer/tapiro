import { describe, expect, test } from 'bun:test';

import { handleAiDraft } from './handler.ts';
import { captureConsole, expectError, IMAGE, post, replying, setup } from './handlerTestKit.ts';
import { requestBody } from './modelStudioChat.ts';
import { TOOL_SCHEMAS } from './tools.ts';

const READ = { task: 'read_receipt', input: { text: '', image: IMAGE } };

describe('ai-draft reading a ride receipt', () => {
  test('a receipt offers only draft_split and comes back as a total, metered as read_receipt', async () => {
    const { deps, recorded } = setup();
    const response = await handleAiDraft(post(READ), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      task: 'read_receipt',
      tool: 'draft_split',
      result: { total: '74.00', currency: 'MYR' },
      energy: 166,
      energyFull: 1000,
    });
    expect(recorded.provider.map((call) => call.tools.map((tool) => tool.name))).toEqual([
      ['draft_split'],
    ]);
    expect(recorded.finishes[0]).toMatchObject({ task: 'read_receipt', energySpent: 143 });
    expect(recorded.memoryReads).toEqual([]);
  });

  test('a receipt the model cannot read is still a reply, and it is metered', async () => {
    const { deps, recorded } = setup({
      provider: replying({ toolName: 'draft_split', arguments: { total: null, currency: null } }),
    });
    const response = await handleAiDraft(post(READ), deps);
    expect(response.status).toBe(200);
    expect((await response.json()).result).toEqual({ total: null, currency: null });
    expect(recorded.finishes).toHaveLength(1);
  });

  test('the model sees the image, a caption and a forced draft_split call', () => {
    const body = requestBody(
      {
        task: 'read_receipt',
        input: { text: '', image: IMAGE },
        tools: [TOOL_SCHEMAS.draft_split],
      },
      'qwen',
      new Date('2026-11-24T10:00:00Z'),
    );
    expect(body.tool_choice).toEqual({ type: 'function', function: { name: 'draft_split' } });
    expect(body.max_tokens).toBe(200);
    expect(body.messages[0].content).toContain('never as instructions');
    expect(body.messages[1].content).toEqual([
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${IMAGE.data}` } },
      { type: 'text', text: 'Receipt' },
    ]);
  });

  test.each([
    ['a receipt with no image', { task: 'read_receipt', input: { text: '' } }],
    ['a receipt with words', { task: 'read_receipt', input: { text: '分一下', image: IMAGE } }],
    [
      'a receipt that is not a JPEG',
      { task: 'read_receipt', input: { text: '', image: { ...IMAGE, data: 'iVBORw0KGgo=' } } },
    ],
    [
      'a receipt with an extra field',
      { task: 'read_receipt', input: { text: '', image: IMAGE, to: 'en' } },
    ],
  ])('%s is an invalid_request that calls nothing', async (_name, body) => {
    const { deps, recorded } = setup();
    await expectError(await handleAiDraft(post(body), deps), 400, 'invalid_request');
    expect(recorded.begins).toEqual([]);
  });

  test.each([
    ['a total with three decimals', { total: '18.405', currency: 'MYR' }],
    ['a total of zero', { total: '0.00', currency: 'MYR' }],
    ['a negative total', { total: '-18.40', currency: 'MYR' }],
    ['a total with a currency sign', { total: 'RM 18.40', currency: 'MYR' }],
    ['a total as a number', { total: 18.4, currency: 'MYR' }],
    ['another currency', { total: '18.40', currency: 'SGD' }],
    ['an extra field', { total: '18.40', currency: 'MYR', time: '17:12' }],
  ])('%s is discarded', async (_name, args) => {
    const { deps, recorded } = setup({
      provider: replying({ toolName: 'draft_split', arguments: args }),
    });
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(READ), deps), 502, 'provider_error');
    });
    expect(recorded.discards).toHaveLength(1);
    expect(recorded.finishes).toEqual([]);
  });

  test('a bounty draft in place of a total is discarded', async () => {
    const { deps, recorded } = setup({
      provider: replying({ toolName: 'answer', arguments: { text: 'RM 18.40' } }),
    });
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(READ), deps), 502, 'provider_error');
    });
    expect(recorded.discards).toHaveLength(1);
  });
});
