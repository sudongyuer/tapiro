import { describe, expect, test } from 'bun:test';

import { handleAiDraft } from './handler.ts';
import { fakeProvider, selectProvider, type ProviderCall } from './provider.ts';
import {
  captureConsole,
  DRAFT,
  expectError,
  okBegin,
  post,
  replying,
  SECRET_PROMPT,
  setup,
  USER,
} from './handlerTestKit.ts';

describe('ai-draft', () => {
  test('only POST', async () => {
    const { deps } = setup();
    const response = await handleAiDraft(new Request('http://localhost/ai-draft'), deps);
    await expectError(response, 405, 'method_not_allowed');
  });

  test('no token or a bad token is refused before anything else runs', async () => {
    for (const token of [null, 'bad']) {
      const { deps, recorded } = setup();
      await expectError(await handleAiDraft(post(DRAFT, token), deps), 401, 'unauthorized');
      expect(recorded.begins).toEqual([]);
      expect(recorded.provider).toEqual([]);
    }
  });

  test.each([
    ['not json', 'not json'],
    ['an unknown task', { task: 'publish_bounty', input: { text: 'x' } }],
    ['blank text', { task: 'answer', input: { text: '   ' } }],
    ['text past the limit', { task: 'answer', input: { text: 'x'.repeat(2001) } }],
    ['an extra top-level field', { ...DRAFT, payeeMethods: [] }],
    ['an extra input field', { task: 'answer', input: { text: 'x', otherUser: 'y' } }],
    ['a translation with no target', { task: 'translate', input: { text: 'x' } }],
    ['a translation to an unknown language', { task: 'translate', input: { text: 'x', to: 'fr' } }],
    ['a target on a task that takes none', { task: 'answer', input: { text: 'x', to: 'en' } }],
  ])('%s is an invalid request that costs nothing', async (_name, body) => {
    const { deps, recorded } = setup();
    await expectError(await handleAiDraft(post(body), deps), 400, 'invalid_request');
    expect(recorded.begins).toEqual([]);
  });

  test.each([
    ['consent_required', 403],
    ['hungry', 429],
    ['busy', 409],
  ] as const)('%s stops the call before the provider', async (status, code) => {
    const { deps, recorded } = setup({}, { status });
    await expectError(await handleAiDraft(post(DRAFT), deps), code, status);
    expect(recorded.provider).toEqual([]);
    expect(recorded.finishes).toEqual([]);
  });

  test('a draft comes back with the energy left, metered and with no tokens in the answer', async () => {
    const { deps, recorded } = setup();
    const response = await handleAiDraft(post(DRAFT), deps);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.task).toBe('draft_bounty');
    expect(body.result.title).toBe(SECRET_PROMPT);
    expect(body.energy).toBe(166);
    expect(body.energyFull).toBe(1000);
    expect(JSON.stringify(body)).not.toMatch(/token|model/i);
    expect(recorded.finishes).toEqual([
      {
        userId: USER,
        lease: 'lease-1',
        task: 'draft_bounty',
        model: 'fake',
        inputTokens: 3000,
        outputTokens: 600,
        energySpent: 334,
      },
    ]);
    expect(recorded.aborts).toEqual([]);
  });

  test('the provider receives the tool for the task and only the validated input', async () => {
    const { deps, recorded } = setup();
    await handleAiDraft(post({ task: 'translate', input: { text: ' hello ', to: 'ms' } }), deps);
    expect(recorded.provider).toHaveLength(1);
    const [call] = recorded.provider;
    expect(call.task).toBe('translate');
    expect(call.input).toEqual({ text: 'hello', to: 'ms' });
    expect(call.tools.map((tool) => tool.name)).toEqual(['translate']);
  });

  test('answer and translate return their text', async () => {
    const { deps } = setup();
    const answer = await handleAiDraft(post({ task: 'answer', input: { text: 'why' } }), deps);
    expect((await answer.json()).result).toEqual({ text: '[fake] why' });
    const translated = await handleAiDraft(
      post({ task: 'translate', input: { text: 'hi', to: 'en' } }),
      deps,
    );
    expect((await translated.json()).result).toEqual({ text: '[en] hi' });
  });

  test('a call that started on the last of the energy is still answered in full', async () => {
    const { deps, recorded } = setup({}, okBegin(1));
    const response = await handleAiDraft(post(DRAFT), deps);
    expect(response.status).toBe(200);
    expect((await response.json()).result.title).toBe(SECRET_PROMPT);
    expect(recorded.finishes[0].energySpent).toBe(334);
  });

  test('a provider that throws is a provider_error that deducts nothing and frees the lease', async () => {
    const { deps, recorded } = setup({
      provider: {
        async generate() {
          throw new Error('boom');
        },
      },
    });
    const lines = await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 502, 'provider_error');
    });
    expect(recorded.finishes).toEqual([]);
    expect(recorded.aborts).toEqual(['lease-1']);
    expect(lines).toEqual(['ai-draft: provider_error']);
  });

  test('a provider that times out is a provider_error that deducts nothing, and it is told to stop', async () => {
    let aborted = false;
    const { deps, recorded } = setup({
      timeoutMs: 5,
      provider: {
        generate(_call, signal) {
          signal.addEventListener('abort', () => {
            aborted = true;
          });
          return new Promise(() => {});
        },
      },
    });
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 502, 'provider_error');
    });
    expect(aborted).toBe(true);
    expect(recorded.finishes).toEqual([]);
    expect(recorded.aborts).toEqual(['lease-1']);
  });

  test.each([
    ['a tool the task did not ask for', { toolName: 'publish_bounty' }],
    ['an unknown field in the draft', { arguments: { text: 'x', extra: true } }],
    ['a draft of the wrong shape', { arguments: { title: 'only a title' } }],
  ])('%s is discarded: the user pays nothing, the tokens are recorded', async (_name, reply) => {
    const { deps, recorded } = setup({ provider: replying(reply) });
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 502, 'provider_error');
    });
    expect(recorded.finishes).toEqual([]);
    expect(recorded.aborts).toEqual([]);
    expect(recorded.discards).toEqual([
      {
        userId: USER,
        lease: 'lease-1',
        task: 'draft_bounty',
        model: 'fake',
        inputTokens: 3000,
        outputTokens: 600,
      },
    ]);
  });

  test.each([
    [
      'a usage that is not a count',
      { inputTokens: -1 },
      { inputTokens: 0, outputTokens: 600, model: 'fake' },
    ],
    [
      'a usage that is missing',
      { outputTokens: Number.NaN },
      { inputTokens: 3000, outputTokens: 0, model: 'fake' },
    ],
    ['no model name', { model: '' }, { inputTokens: 3000, outputTokens: 600, model: 'unknown' }],
  ])('%s is discarded with what can still be recorded', async (_name, reply, recordedAs) => {
    const { deps, recorded } = setup({ provider: replying(reply) });
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 502, 'provider_error');
    });
    expect(recorded.finishes).toEqual([]);
    expect(recorded.discards).toEqual([
      { userId: USER, lease: 'lease-1', task: 'draft_bounty', ...recordedAs },
    ]);
  });

  test('too many discards today is a provider_error with no provider call', async () => {
    const { deps, recorded } = setup({}, { status: 'too_many_discards' });
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 502, 'provider_error');
    });
    expect(recorded.provider).toEqual([]);
  });

  test('a failed discard does not change the answer', async () => {
    const { deps } = setup({ provider: replying({ toolName: 'publish_bounty' }) });
    deps.store.discard = async () => {
      throw new Error('db down');
    };
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 502, 'provider_error');
    });
  });

  test.each([
    [
      'a deadline with a start',
      { deadlineAt: '2026-11-10T10:00:00Z', startsAt: '2026-11-10T10:00:00Z' },
    ],
    ['a start with no end', { startsAt: '2026-11-10T10:00:00Z' }],
    ['a time with no offset', { deadlineAt: '2026-11-10T10:00:00' }],
    [
      'a window that ends first',
      { startsAt: '2026-11-10T11:00:00Z', endsAt: '2026-11-10T10:00:00Z' },
    ],
  ])('%s in a draft is a provider_error', async (_name, time) => {
    const args = (
      await fakeProvider.generate(
        { ...DRAFT, tools: [] } as ProviderCall,
        new AbortController().signal,
      )
    ).arguments as Record<string, unknown>;
    const { deps } = setup({ provider: replying({ arguments: { ...args, ...time } }) });
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 502, 'provider_error');
    });
  });

  test('no provider configured is a provider_error, not the fake', async () => {
    expect(selectProvider(undefined)).toBeNull();
    expect(selectProvider('qwen')).toBeNull();
    expect(selectProvider('fake')).toBe(fakeProvider);
    const { deps, recorded } = setup({ provider: null });
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 502, 'provider_error');
    });
    expect(recorded.begins).toEqual([]);
  });

  test('a metering failure withholds the answer', async () => {
    const { deps } = setup();
    deps.store.finish = async () => {
      throw new Error('db down');
    };
    await captureConsole(async () => {
      const response = await handleAiDraft(post(DRAFT), deps);
      const text = await response.text();
      expect(response.status).toBe(500);
      expect(text).not.toContain(SECRET_PROMPT);
    });
  });

  test('a failed begin is a server_error and calls no provider', async () => {
    const { deps, recorded } = setup();
    deps.store.begin = async () => {
      throw new Error('db down');
    };
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 500, 'server_error');
    });
    expect(recorded.provider).toEqual([]);
  });

  test('a failed abort does not change the answer', async () => {
    const { deps } = setup({
      provider: {
        async generate() {
          throw new Error('boom');
        },
      },
    });
    deps.store.abort = async () => {
      throw new Error('db down');
    };
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(DRAFT), deps), 502, 'provider_error');
    });
  });

  test('the prompt reaches neither the logs nor the metering, even when an error quotes it', async () => {
    const { deps, recorded } = setup();
    const lines = await captureConsole(async () => {
      await handleAiDraft(post(DRAFT), deps);
      const failing = setup({
        provider: {
          async generate(call) {
            throw new Error(`upstream refused: ${call.input.text}`);
          },
        },
      });
      await handleAiDraft(post(DRAFT), failing.deps);
      const dbDown = setup();
      dbDown.deps.store.finish = async () => {
        throw new Error(`insert failed for ${SECRET_PROMPT}`);
      };
      await handleAiDraft(post(DRAFT), dbDown.deps);
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('\n')).not.toContain(SECRET_PROMPT);
    expect(JSON.stringify(recorded.finishes)).not.toContain(SECRET_PROMPT);
  });
});
