import { describe, expect, test } from 'bun:test';

import { handleAiDraft } from './handler.ts';
import { fakeProvider } from './provider.ts';
import { captureConsole, expectError, IMAGE, post, replying, setup } from './handlerTestKit.ts';
import { IMAGE_DATA_MAX } from './tools.ts';

describe('ai-draft for the 问小貘 sheet', () => {
  test('the sheet offers draft, answer and clarify, and pick only with an image', async () => {
    const { deps, recorded } = setup();
    await handleAiDraft(post({ task: 'ask', input: { text: '帮我取快递' } }), deps);
    await handleAiDraft(post({ task: 'ask', input: { text: '', image: IMAGE } }), deps);
    expect(recorded.provider.map((call) => call.tools.map((tool) => tool.name))).toEqual([
      ['draft_bounty', 'answer', 'clarify'],
      ['draft_bounty', 'answer', 'clarify', 'pick'],
    ]);
  });

  test.each([
    ['帮我取快递，今晚之前', 'draft_bounty'],
    ['靠谱度怎么涨？', 'answer'],
    ['取快递', 'clarify'],
  ])('the sheet says which tool answered %s', async (text, tool) => {
    const { deps, recorded } = setup();
    const response = await handleAiDraft(post({ task: 'ask', input: { text } }), deps);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.task).toBe('ask');
    expect(body.tool).toBe(tool);
    expect(recorded.finishes[0].task).toBe('ask');
  });

  test('a screenshot with several requests comes back as a pick of drafts', async () => {
    const { deps } = setup();
    const response = await handleAiDraft(
      post({ task: 'ask', input: { text: '', image: IMAGE } }),
      deps,
    );
    const body = await response.json();
    expect(body.tool).toBe('pick');
    expect(body.result.items).toHaveLength(2);
  });

  test.each([
    [
      'an image on a task other than ask',
      { task: 'draft_bounty', input: { text: 'x', image: IMAGE } },
    ],
    [
      'an image that is not a JPEG',
      { task: 'ask', input: { text: '', image: { ...IMAGE, data: 'iVBORw0KGgo=' } } },
    ],
    [
      'an image of another media type',
      { task: 'ask', input: { text: '', image: { ...IMAGE, mediaType: 'image/png' } } },
    ],
    [
      'an image that is not base64',
      { task: 'ask', input: { text: '', image: { ...IMAGE, data: '/9j/<script>' } } },
    ],
    [
      'an image past the limit',
      {
        task: 'ask',
        input: { text: '', image: { ...IMAGE, data: `/9j/${'A'.repeat(IMAGE_DATA_MAX)}` } },
      },
    ],
    [
      'an image with an extra field',
      { task: 'ask', input: { text: '', image: { ...IMAGE, name: 'x.jpg' } } },
    ],
    ['an empty ask with no image', { task: 'ask', input: { text: '  ' } }],
  ])('%s is an invalid_request that calls nothing', async (_name, body) => {
    const { deps, recorded } = setup();
    await expectError(await handleAiDraft(post(body), deps), 400, 'invalid_request');
    expect(recorded.begins).toEqual([]);
  });

  test.each([
    ['pick without an image', { toolName: 'pick', arguments: { items: [] } }],
    ['translate in the sheet', { toolName: 'translate', arguments: { text: 'x' } }],
    [
      'a clarify with four choices',
      { toolName: 'clarify', arguments: { question: '?', choices: ['a', 'b', 'c', 'd'] } },
    ],
    [
      'a clarify with no choices',
      { toolName: 'clarify', arguments: { question: '?', choices: [] } },
    ],
  ])('%s is discarded', async (_name, reply) => {
    const { deps, recorded } = setup({ provider: replying(reply) });
    await captureConsole(async () => {
      await expectError(
        await handleAiDraft(post({ task: 'ask', input: { text: '取快递' } }), deps),
        502,
        'provider_error',
      );
    });
    expect(recorded.discards).toHaveLength(1);
    expect(recorded.finishes).toEqual([]);
  });

  test('a pick holding one draft with a broken time is discarded whole', async () => {
    const [first, second] = (
      (
        await fakeProvider.generate(
          { task: 'ask', input: { text: '', image: IMAGE }, tools: [] },
          new AbortController().signal,
        )
      ).arguments as { items: { summary: string; draft: Record<string, unknown> }[] }
    ).items;
    const broken = { ...second, draft: { ...second.draft, startsAt: '2026-11-10T10:00:00Z' } };
    const { deps, recorded } = setup({
      provider: replying({ toolName: 'pick', arguments: { items: [first, broken] } }),
    });
    await captureConsole(async () => {
      await expectError(
        await handleAiDraft(post({ task: 'ask', input: { text: '', image: IMAGE } }), deps),
        502,
        'provider_error',
      );
    });
    expect(recorded.discards).toHaveLength(1);
  });
});
