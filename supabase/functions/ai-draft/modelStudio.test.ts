import { describe, expect, test } from 'bun:test';

import { handleAiDraft } from './handler.ts';
import {
  captureConsole,
  DRAFT,
  expectError,
  IMAGE,
  post,
  SECRET_PROMPT,
  setup,
} from './handlerTestKit.ts';
import { DEEPSEEK_FALLBACK, QWEN_FLASH, QWEN_PLUS } from './models.ts';
import { FALLBACK_WINDOW_MS, modelStudioProvider } from './modelStudio.ts';
import { ERRORS, textCompletion, toolCompletion } from './modelStudioFixtures.ts';
import { API_KEY, BASE_URL, ok, scriptedFetch, type Scripted } from './modelStudioTestKit.ts';

const NOW = Date.parse('2026-11-13T04:30:00Z');

const DRAFT_ARGS = {
  title: '帮取快递',
  category: 'pickup',
  rewardMajor: 10,
  currency: 'MYR',
  description: null,
  deadlineAt: '2026-11-13T22:00:00+08:00',
  startsAt: null,
  endsAt: null,
  placeHint: 'Pyramid',
};

function steppingClock(step: number) {
  let now = NOW;
  return () => {
    const current = now;
    now += step;
    return current;
  };
}

function cutOff<T extends { choices: { finish_reason: string }[] }>(completion: T): T {
  return { ...completion, choices: [{ ...completion.choices[0], finish_reason: 'length' }] };
}

type Options = { clock?: () => number; fallback?: string | null };

function provider(
  script: Scripted[],
  { clock = () => NOW, fallback = DEEPSEEK_FALLBACK }: Options,
) {
  const scripted = scriptedFetch(script);
  return {
    ...scripted,
    provider: modelStudioProvider({
      baseUrl: BASE_URL,
      apiKey: API_KEY,
      fallback,
      fetch: scripted.fetch,
      now: clock,
    }),
  };
}

async function run(body: unknown, script: Scripted[], options: Options = {}) {
  const model = provider(script, options);
  const { deps, recorded } = setup({ provider: model.provider, timeoutMs: 200 });
  let response: Response | undefined;
  const logs = await captureConsole(async () => {
    response = await handleAiDraft(post(body), deps);
  });
  return { response: response!, recorded, sent: model.sent, logs };
}

describe('Model Studio request', () => {
  test('a draft goes to the pinned plus snapshot in Singapore with the key only in the header', async () => {
    const { sent } = await run(DRAFT, [ok(toolCompletion(QWEN_PLUS, 'draft_bounty', DRAFT_ARGS))]);
    expect(sent).toHaveLength(1);
    const [request] = sent;
    expect(request.url).toBe(`${BASE_URL}/chat/completions`);
    expect(request.headers.authorization).toBe(`Bearer ${API_KEY}`);
    expect(request.body).toMatchObject({
      model: QWEN_PLUS,
      enable_thinking: false,
      stream: false,
      parallel_tool_calls: false,
      tool_choice: { type: 'function', function: { name: 'draft_bounty' } },
    });
    expect(JSON.stringify(request.body)).not.toContain(API_KEY);
    const tools = request.body.tools as { type: string; function: { name: string } }[];
    expect(tools.map((tool) => [tool.type, tool.function.name])).toEqual([
      ['function', 'draft_bounty'],
    ]);
  });

  test('the system prompt carries Malaysia time so 今晚 has a date', async () => {
    const { sent } = await run(DRAFT, [ok(toolCompletion(QWEN_PLUS, 'draft_bounty', DRAFT_ARGS))]);
    const [system, user] = sent[0].body.messages as { role: string; content: unknown }[];
    expect(system.role).toBe('system');
    expect(system.content).toContain('2026-11-13T12:30+08:00');
    expect(user).toEqual({ role: 'user', content: SECRET_PROMPT });
  });

  test.each([
    ['translate', { task: 'translate', input: { text: 'OK', to: 'ms' } }, QWEN_FLASH],
    ['answer', { task: 'answer', input: { text: '怎么付款？' } }, QWEN_FLASH],
    ['ask', { task: 'ask', input: { text: '帮我取快递' } }, QWEN_PLUS],
  ])('%s uses its pinned model', async (_task, body, model) => {
    const { sent } = await run(body, [ok(textCompletion(model, 'x'))]);
    expect(sent[0].body.model).toBe(model);
  });

  test('a translation names the target language and forces the translate tool', async () => {
    const body = { task: 'translate', input: { text: 'OK, saya sampai', to: 'zh-Hans' } };
    const { sent } = await run(body, [ok(toolCompletion(QWEN_FLASH, 'translate', { text: '好' }))]);
    const [system] = sent[0].body.messages as { content: string }[];
    expect(system.content).toContain('Simplified Chinese');
    expect(sent[0].body.tool_choice).toEqual({ type: 'function', function: { name: 'translate' } });
  });

  test('ask lets the model choose among its three tools', async () => {
    const { sent } = await run({ task: 'ask', input: { text: '取快递' } }, [
      ok(toolCompletion(QWEN_PLUS, 'clarify', { question: '什么时候？', choices: ['今晚'] })),
    ]);
    const tools = (sent[0].body.tools as { function: { name: string } }[]).map(
      (t) => t.function.name,
    );
    expect(tools).toEqual(['draft_bounty', 'answer', 'clarify']);
    expect(sent[0].body.tool_choice).toBe('auto');
  });

  test('a screenshot goes as a JPEG data URL beside the words', async () => {
    const body = { task: 'ask', input: { text: '这些帮我发', image: IMAGE } };
    const { sent } = await run(body, [ok(textCompletion(QWEN_PLUS, 'x'))]);
    const [, user] = sent[0].body.messages as { content: unknown }[];
    expect(user.content).toEqual([
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${IMAGE.data}` } },
      { type: 'text', text: '这些帮我发' },
    ]);
  });
});

describe('Model Studio replies and charging', () => {
  test('a valid tool call is charged from its reported usage under the pinned model', async () => {
    const usage = { prompt_tokens: 2400, completion_tokens: 300 };
    const { response, recorded } = await run(DRAFT, [
      ok(toolCompletion(QWEN_PLUS, 'draft_bounty', DRAFT_ARGS, usage)),
    ]);
    expect(response.status).toBe(200);
    expect((await response.json()).result).toEqual(DRAFT_ARGS);
    expect(recorded.finishes).toHaveLength(1);
    expect(recorded.finishes[0]).toMatchObject({
      model: QWEN_PLUS,
      inputTokens: 2400,
      outputTokens: 300,
      energySpent: 250,
    });
  });

  test('ask answered in plain words becomes an answer, charged as one', async () => {
    const { response, recorded } = await run({ task: 'ask', input: { text: '押金要多少？' } }, [
      ok(textCompletion(QWEN_PLUS, '  一般 RM 10。 ')),
    ]);
    expect(await response.json()).toMatchObject({
      tool: 'answer',
      result: { text: '一般 RM 10。' },
    });
    expect(recorded.finishes).toHaveLength(1);
  });

  test.each([
    ['plain words where a draft was forced', DRAFT, ok(textCompletion(QWEN_PLUS, '好的'))],
    [
      'plain words where an answer was forced',
      { task: 'answer', input: { text: '怎么付款？' } },
      ok(textCompletion(QWEN_PLUS, '转账就行')),
    ],
    [
      'an answer cut off at max_tokens',
      { task: 'ask', input: { text: '详细讲讲签证续签' } },
      ok(cutOff(textCompletion(QWEN_PLUS, '第一步，先去'))),
    ],
    [
      'a tool call written as prose',
      { task: 'ask', input: { text: '帮我取快递' } },
      ok(textCompletion(QWEN_PLUS, '<tool_call>{"name": "draft_bounty"}</tool_call>')),
    ],
    [
      'bare JSON written as prose',
      { task: 'ask', input: { text: '帮我取快递' } },
      ok(textCompletion(QWEN_PLUS, '{"title": "帮取快递"}')),
    ],
    [
      'arguments cut off at max_tokens',
      DRAFT,
      ok(toolCompletion(QWEN_PLUS, 'draft_bounty', '{"title": "帮取快')),
    ],
    [
      'a draft that breaks the contract',
      DRAFT,
      ok(toolCompletion(QWEN_PLUS, 'draft_bounty', { ...DRAFT_ARGS, rewardMajor: -5 })),
    ],
    ['a tool the task did not offer', DRAFT, ok(toolCompletion(QWEN_PLUS, 'pick', { items: [] }))],
  ])('%s is discarded with its billed usage and charges nothing', async (_name, body, reply) => {
    const { response, recorded } = await run(body, [reply]);
    await expectError(response, 502, 'provider_error');
    expect(recorded.finishes).toEqual([]);
    expect(recorded.discards).toHaveLength(1);
    expect(recorded.discards[0].inputTokens).toBeGreaterThan(0);
  });

  test('a 200 with no usage is discarded rather than handed out unmetered', async () => {
    const reply = toolCompletion(QWEN_PLUS, 'draft_bounty', DRAFT_ARGS) as Record<string, unknown>;
    delete reply.usage;
    const { response, recorded } = await run(DRAFT, [ok(reply)]);
    await expectError(response, 502, 'provider_error');
    expect(recorded.finishes).toEqual([]);
    expect(recorded.discards).toEqual([
      expect.objectContaining({ model: QWEN_PLUS, inputTokens: 0, outputTokens: 0 }),
    ]);
  });

  test('a 200 whose body is not JSON is discarded, not thrown', async () => {
    const { response, recorded } = await run(DRAFT, [{ raw: '<html>gateway</html>' }]);
    await expectError(response, 502, 'provider_error');
    expect(recorded.discards).toHaveLength(1);
    expect(recorded.aborts).toEqual([]);
  });
});

describe('Model Studio errors and the DeepSeek fallback', () => {
  test.each([
    ['throttling', ERRORS.throttled],
    ['an internal error', ERRORS.internal],
    ['an overload', ERRORS.overloaded],
    ['a retired pin', ERRORS.modelNotFound],
  ])(
    '%s on Qwen falls back once to the pinned DeepSeek, charged at its usage',
    async (_name, error) => {
      const usage = { prompt_tokens: 2000, completion_tokens: 400 };
      const { response, recorded, sent } = await run(DRAFT, [
        error,
        ok(toolCompletion(DEEPSEEK_FALLBACK, 'draft_bounty', DRAFT_ARGS, usage)),
      ]);
      expect(response.status).toBe(200);
      expect(sent.map((request) => request.body.model)).toEqual([QWEN_PLUS, DEEPSEEK_FALLBACK]);
      expect(recorded.finishes).toEqual([
        expect.objectContaining({ model: DEEPSEEK_FALLBACK, inputTokens: 2000, outputTokens: 400 }),
      ]);
    },
  );

  test('a gateway 502 is not retried, since the model may already have run', async () => {
    const gateway = { status: 502, body: { error: { code: 'BadGateway', message: 'x' } } };
    const { response, sent } = await run(DRAFT, [gateway]);
    await expectError(response, 502, 'provider_error');
    expect(sent).toHaveLength(1);
  });

  test('a connection lost after 3 s is not retried, since the request may have been billed', async () => {
    const { response, sent } = await run(DRAFT, ['network_error'], { clock: steppingClock(2_000) });
    await expectError(response, 502, 'provider_error');
    expect(sent).toHaveLength(1);
  });

  test('an error inside the fallback window is retried', async () => {
    const { response, sent } = await run(
      DRAFT,
      [ERRORS.overloaded, ok(toolCompletion(DEEPSEEK_FALLBACK, 'draft_bounty', DRAFT_ARGS))],
      { clock: steppingClock(3_000) },
    );
    expect(response.status).toBe(200);
    expect(sent).toHaveLength(2);
  });

  test('an unreachable Qwen falls back too', async () => {
    const { response, sent } = await run(DRAFT, [
      'network_error',
      ok(toolCompletion(DEEPSEEK_FALLBACK, 'draft_bounty', DRAFT_ARGS)),
    ]);
    expect(response.status).toBe(200);
    expect(sent).toHaveLength(2);
  });

  test.each([
    ['a refused key', ERRORS.invalidApiKey],
    ['an account in arrears', ERRORS.arrearage],
    ['content the platform blocked', ERRORS.inspection],
  ])('%s is dizzy at once: no fallback, nothing charged or counted', async (_name, error) => {
    const { response, recorded, sent } = await run(DRAFT, [error]);
    await expectError(response, 502, 'provider_error');
    expect(sent).toHaveLength(1);
    expect(recorded.finishes).toEqual([]);
    expect(recorded.discards).toEqual([]);
    expect(recorded.aborts).toEqual(['lease-1']);
  });

  test('when the fallback fails too, nothing is charged', async () => {
    const { response, recorded, sent } = await run(DRAFT, [ERRORS.overloaded, ERRORS.throttled]);
    await expectError(response, 502, 'provider_error');
    expect(sent).toHaveLength(2);
    expect(recorded.finishes).toEqual([]);
    expect(recorded.aborts).toEqual(['lease-1']);
  });

  test('a fallback that returns a broken draft is discarded under the DeepSeek pin', async () => {
    const { recorded } = await run(DRAFT, [
      ERRORS.internal,
      ok(toolCompletion(DEEPSEEK_FALLBACK, 'draft_bounty', { title: '' })),
    ]);
    expect(recorded.discards).toEqual([expect.objectContaining({ model: DEEPSEEK_FALLBACK })]);
  });

  test('an error that comes after the fallback window is not retried', async () => {
    const clock = steppingClock(FALLBACK_WINDOW_MS);
    const { response, sent } = await run(DRAFT, [ERRORS.overloaded], { clock });
    await expectError(response, 502, 'provider_error');
    expect(sent).toHaveLength(1);
  });

  test('with no fallback configured, an overloaded Qwen is dizzy after one call', async () => {
    const { response, recorded, sent } = await run(DRAFT, [ERRORS.overloaded], { fallback: null });
    await expectError(response, 502, 'provider_error');
    expect(sent).toHaveLength(1);
    expect(recorded.aborts).toEqual(['lease-1']);
  });

  test('a timeout aborts the call, tries no fallback and charges nothing', async () => {
    const { response, recorded, sent } = await run(DRAFT, ['hang']);
    await expectError(response, 502, 'provider_error');
    expect(sent).toHaveLength(1);
    expect(recorded.finishes).toEqual([]);
    expect(recorded.discards).toEqual([]);
    expect(recorded.aborts).toEqual(['lease-1']);
  });

  test('logs name the status, code and model, never the prompt, the reply or the key', async () => {
    const { logs } = await run(DRAFT, [ERRORS.inspection]);
    expect(logs).toContain(
      'ai-draft: model_studio 400 data_inspection_failed qwen3.7-plus-2026-05-26',
    );
    const all = logs.join('\n');
    expect(all).not.toContain(SECRET_PROMPT);
    expect(all).not.toContain(API_KEY);
    expect(all).not.toContain('inappropriate');
  });

  test('a provider error code that is not a plain identifier is not logged verbatim', async () => {
    const odd = { status: 500, body: { error: { code: `bad ${SECRET_PROMPT}`, message: 'x' } } };
    const { logs } = await run(DRAFT, [odd, ERRORS.internal]);
    expect(logs.join('\n')).not.toContain(SECRET_PROMPT);
    expect(logs).toContain('ai-draft: model_studio 500 http_500 qwen3.7-plus-2026-05-26');
  });
});
