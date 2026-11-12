import { describe, expect, test } from 'bun:test';

import { handleAiDraft } from './handler.ts';
import { captureConsole, expectError, post, replying, setup } from './handlerTestKit.ts';
import { AUDIO_DATA_MAX } from './tools.ts';

const AUDIO = { mediaType: 'audio/mp4' as const, data: 'AAAAHGZ0eXBNNEEg' };
const TRANSCRIBE = { task: 'transcribe', input: { audio: AUDIO, language: 'zh-Hans' } };

describe('ai-draft cloud transcription', () => {
  test('a recording comes back as words, offered only the transcript tool and metered as transcribe', async () => {
    const { deps, recorded } = setup();
    const response = await handleAiDraft(post(TRANSCRIBE), deps);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ task: 'transcribe', tool: 'transcript', energy: 166 });
    expect(typeof body.result.text).toBe('string');
    expect(recorded.provider.map((call) => call.tools.map((tool) => tool.name))).toEqual([
      ['transcript'],
    ]);
    expect(recorded.finishes[0]).toMatchObject({ task: 'transcribe', inputTokens: 300 });
  });

  test('silence comes back as empty words and is still metered', async () => {
    const { deps, recorded } = setup({
      provider: replying({ toolName: 'transcript', arguments: { text: '' } }),
    });
    const response = await handleAiDraft(post(TRANSCRIBE), deps);
    expect((await response.json()).result).toEqual({ text: '' });
    expect(recorded.finishes).toHaveLength(1);
  });

  test.each([
    [
      'a recording with text beside it',
      { ...TRANSCRIBE, input: { ...TRANSCRIBE.input, text: 'x' } },
    ],
    [
      'a recording in an unknown language',
      { ...TRANSCRIBE, input: { audio: AUDIO, language: 'fr' } },
    ],
    ['a recording with no language', { task: 'transcribe', input: { audio: AUDIO } }],
    [
      'a recording that is not MPEG-4',
      { ...TRANSCRIBE, input: { audio: { ...AUDIO, data: '/9j/4AAQSkZJRg==' }, language: 'en' } },
    ],
    [
      'a recording of another media type',
      { ...TRANSCRIBE, input: { audio: { ...AUDIO, mediaType: 'audio/wav' }, language: 'en' } },
    ],
    [
      'a recording past the limit',
      {
        ...TRANSCRIBE,
        input: {
          audio: { ...AUDIO, data: `${AUDIO.data}${'A'.repeat(AUDIO_DATA_MAX)}` },
          language: 'en',
        },
      },
    ],
    ['audio on the sheet task', { task: 'ask', input: { text: 'x', audio: AUDIO } }],
  ])('%s is an invalid_request that calls nothing', async (_name, body) => {
    const { deps, recorded } = setup();
    await expectError(await handleAiDraft(post(body), deps), 400, 'invalid_request');
    expect(recorded.begins).toEqual([]);
  });

  test('a draft in place of the transcript is discarded and costs nothing', async () => {
    const { deps, recorded } = setup({
      provider: replying({ toolName: 'answer', arguments: { text: 'x' } }),
    });
    await captureConsole(async () => {
      await expectError(await handleAiDraft(post(TRANSCRIBE), deps), 502, 'provider_error');
    });
    expect(recorded.discards[0]).toMatchObject({ task: 'transcribe' });
    expect(recorded.finishes).toEqual([]);
  });
});
