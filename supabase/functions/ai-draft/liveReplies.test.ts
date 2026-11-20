import { describe, expect, test } from 'bun:test';

import { handleAiDraft } from './handler.ts';
import { expectError, IMAGE, post, setup } from './handlerTestKit.ts';
import { QWEN_FLASH, QWEN_PLUS } from './models.ts';
import { modelStudioProvider } from './modelStudio.ts';
import { toolCompletion } from './modelStudioFixtures.ts';
import { RECORDED_DRAFT_REPLY, RECORDED_SOURCE } from './modelStudioRecorded.ts';
import { API_KEY, ORIGIN, ok, scriptedFetch, type Scripted } from './modelStudioTestKit.ts';

const PICKUP = { task: 'draft_bounty', input: { text: '帮我今晚之前去取个快递，给 15 块' } };

async function run(body: unknown, script: Scripted[]) {
  const scripted = scriptedFetch(script);
  const provider = modelStudioProvider({
    origin: ORIGIN,
    apiKey: API_KEY,
    fallback: null,
    fetch: scripted.fetch,
    now: () => Date.parse('2026-11-20T11:30:00Z'),
  });
  const { deps, recorded } = setup({ provider, timeoutMs: 200 });
  const response = await handleAiDraft(post(body), deps);
  return { response, recorded, sent: scripted.sent };
}

type Node = Record<string, unknown>;

function typeLists(node: unknown, path: string, found: string[]) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => typeLists(item, `${path}[${index}]`, found));
    return found;
  }
  if (typeof node !== 'object' || node === null) return found;
  const { type } = node as Node;
  if (Array.isArray(type) && type.some((name) => name === 'integer' || name === 'number')) {
    found.push(path);
  }
  for (const [key, value] of Object.entries(node)) typeLists(value, `${path}.${key}`, found);
  return found;
}

describe(`Qwen replies recorded from ${RECORDED_SOURCE}`, () => {
  test('a draft whose reward came back as the string "15" reaches the app as the number 15', async () => {
    const { response, recorded } = await run(PICKUP, [ok(RECORDED_DRAFT_REPLY)]);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result).toMatchObject({ rewardMajor: 15, currency: 'MYR', category: 'pickup' });
    expect(recorded.finishes).toEqual([
      expect.objectContaining({ model: QWEN_PLUS, inputTokens: 1125, outputTokens: 202 }),
    ]);
  });

  test('no numeric field is offered to the model as a type list, which Qwen answers with a string', async () => {
    const { sent } = await run({ task: 'ask', input: { text: '帮我取快递' } }, [
      ok(toolCompletion(QWEN_PLUS, 'clarify', { question: '什么时候？', choices: ['今晚'] })),
    ]);
    expect(typeLists(sent[0].body.tools, 'tools', [])).toEqual([]);
  });

  test('the translate tool tells the model its text is the translation, not the original', async () => {
    const body = { task: 'translate', input: { text: 'OK, saya sampai', to: 'zh-Hans' } };
    const { sent } = await run(body, [ok(toolCompletion(QWEN_FLASH, 'translate', { text: '好' }))]);
    const [tool] = sent[0].body.tools as {
      function: { parameters: { properties: { text: { description?: string } } } };
    }[];
    expect(tool.function.parameters.properties.text.description).toContain(
      'never the original text',
    );
  });

  test.each([
    ['a fraction', '1.5'],
    ['a zero', '0'],
    ['a negative', '-5'],
    ['an amount with a unit', '15元'],
    ['a padded number', ' 15'],
  ])('a reward string that is %s is still discarded', async (_name, reward) => {
    const args = JSON.parse(
      RECORDED_DRAFT_REPLY.choices[0].message.tool_calls[0].function.arguments,
    );
    const reply = toolCompletion(QWEN_PLUS, 'draft_bounty', { ...args, rewardMajor: reward });
    const { response, recorded } = await run(PICKUP, [ok(reply)]);
    await expectError(response, 502, 'provider_error');
    expect(recorded.discards).toHaveLength(1);
  });

  test('a picked draft with a string reward reaches the app as a number', async () => {
    const draft = {
      title: '搬箱子',
      category: 'move',
      rewardMajor: '30',
      currency: 'MYR',
      description: null,
      deadlineAt: null,
      startsAt: null,
      endsAt: null,
      placeHint: null,
    };
    const items = [
      { summary: '搬箱子', draft },
      { summary: '取快递', draft: { ...draft, title: '取快递', rewardMajor: null } },
    ];
    const { response } = await run({ task: 'ask', input: { text: '', image: IMAGE } }, [
      ok(toolCompletion(QWEN_PLUS, 'pick', { items })),
    ]);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.items.map((item: { draft: Node }) => item.draft.rewardMajor)).toEqual([
      30,
      null,
    ]);
  });
});
