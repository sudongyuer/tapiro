import { describe, expect, test } from 'bun:test';

import { transcribeTokens } from './budget.ts';
import { handleAiDraft } from './handler.ts';
import { captureConsole, expectError, post, setup } from './handlerTestKit.ts';
import { DEEPSEEK_FALLBACK, QWEN_ASR } from './models.ts';
import { modelStudioProvider } from './modelStudio.ts';
import { asrResult, ERRORS } from './modelStudioFixtures.ts';
import { API_KEY, ok, ORIGIN, scriptedFetch, type Scripted } from './modelStudioTestKit.ts';

const AUDIO = { mediaType: 'audio/mp4' as const, data: 'AAAAHGZ0eXBNNEEg' };
const transcribe = (language = 'ms') => ({ task: 'transcribe', input: { audio: AUDIO, language } });

async function run(body: unknown, script: Scripted[]) {
  const scripted = scriptedFetch(script);
  const provider = modelStudioProvider({
    origin: ORIGIN,
    apiKey: API_KEY,
    fallback: DEEPSEEK_FALLBACK,
    fetch: scripted.fetch,
  });
  const { deps, recorded } = setup({ provider, timeoutMs: 200 });
  let response: Response | undefined;
  const logs = await captureConsole(async () => {
    response = await handleAiDraft(post(body), deps);
  });
  return { response: response!, recorded, sent: scripted.sent, logs };
}

describe('Model Studio speech recognition', () => {
  test('a recording goes to the ASR model in Singapore as an m4a data URI with the app language as a hint', async () => {
    const { sent } = await run(transcribe('ms'), [ok(asrResult('Tolong ambil bungkusan', 4))]);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe(`${ORIGIN}/api/v1/services/aigc/multimodal-generation/generation`);
    expect(sent[0].headers.authorization).toBe(`Bearer ${API_KEY}`);
    expect(sent[0].headers['x-dashscope-sse']).toBe('disable');
    expect(sent[0].body).toEqual({
      model: QWEN_ASR,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'input_audio', input_audio: { data: `data:audio/mp4;base64,${AUDIO.data}` } },
            ],
          },
        ],
      },
      parameters: { format: 'm4a', sample_rate: '16000', language_hints: ['ms'] },
    });
  });

  test.each([
    ['zh-Hans', 'zh'],
    ['en', 'en'],
  ])('%s is hinted as %s', async (language, hint) => {
    const { sent } = await run(transcribe(language), [ok(asrResult('x', 1))]);
    expect((sent[0].body.parameters as { language_hints: string[] }).language_hints).toEqual([
      hint,
    ]);
  });

  test('the words come back as a transcript, charged by the seconds Model Studio bills', async () => {
    const { response, recorded } = await run(transcribe(), [ok(asrResult('  Tolong ambil  ', 12))]);
    expect(await response.json()).toMatchObject({
      task: 'transcribe',
      tool: 'transcript',
      result: { text: 'Tolong ambil' },
    });
    expect(recorded.finishes).toEqual([
      expect.objectContaining({
        task: 'transcribe',
        model: QWEN_ASR,
        inputTokens: transcribeTokens(12),
        outputTokens: 0,
      }),
    ]);
  });

  test('silence is empty words, still billed and so still charged', async () => {
    const { response, recorded } = await run(transcribe(), [ok(asrResult('', 3))]);
    expect((await response.json()).result).toEqual({ text: '' });
    expect(recorded.finishes[0].inputTokens).toBe(transcribeTokens(3));
  });

  test.each([
    ['no duration', { output: { text: 'x' }, usage: {} }],
    ['no text', { output: {}, usage: { duration: 3 } }],
    ['not an object', 'x'],
  ])('a 200 with %s is discarded and charges nothing', async (_name, body) => {
    const { response, recorded } = await run(transcribe(), [ok(body)]);
    await expectError(response, 502, 'provider_error');
    expect(recorded.finishes).toEqual([]);
    expect(recorded.discards).toEqual([expect.objectContaining({ model: QWEN_ASR })]);
  });

  test('an overloaded ASR is dizzy with no DeepSeek fallback, which has no speech model', async () => {
    const { response, recorded, sent } = await run(transcribe(), [ERRORS.overloaded]);
    await expectError(response, 502, 'provider_error');
    expect(sent).toHaveLength(1);
    expect(recorded.aborts).toEqual(['lease-1']);
  });

  test('a DashScope error code at the top level is logged, the audio never', async () => {
    const error = {
      status: 400,
      body: { code: 'InvalidParameter', message: 'bad', request_id: 'r' },
    };
    const { logs } = await run(transcribe(), [error]);
    expect(logs).toContain(`ai-draft: model_studio 400 InvalidParameter ${QWEN_ASR}`);
    expect(logs.join('\n')).not.toContain(AUDIO.data);
  });
});
