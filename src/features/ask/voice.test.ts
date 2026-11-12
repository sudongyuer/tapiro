import { describe, expect, test } from 'bun:test';
import type { SpeechEvent, SpeechPermissions, SpeechStartResult } from 'tapiro-kit';

import { createAskSession, type AskStorage } from './askSession';
import type { CloudRequest, CloudResult } from './cloudGate';
import type { AskOutcome, PrepareResult } from './consentStore';
import { createVoice, joinSpoken, voiceAccess, type SpeechService } from './voice';

const USER = 'u1';
const AUDIO = 'AAAAHGZ0eXBNNEEg';
const HEARD: CloudResult = {
  kind: 'answered',
  body: { task: 'transcribe', tool: 'transcript', result: { text: '明天帮我去 Pyramid 取快递' } },
};
const GRANTED: SpeechPermissions = { microphone: 'granted', recognition: 'granted' };

function memoryStorage(): AskStorage & { texts: Map<string, string> } {
  const texts = new Map<string, string>();
  return {
    texts,
    readText: (userId) => texts.get(userId) ?? '',
    writeText: (userId, text) => void texts.set(userId, text),
    readConversation: () => null,
    writeConversation: () => undefined,
  };
}

function fakeSpeech({
  permissions = GRANTED,
  granted = GRANTED,
  start = { status: 'started', engine: 'dictation' },
}: {
  permissions?: SpeechPermissions;
  granted?: SpeechPermissions;
  start?: SpeechStartResult;
} = {}) {
  let listener: ((event: SpeechEvent) => void) | null = null;
  const calls: string[] = [];
  const speech: SpeechService = {
    permissions: async () => permissions,
    requestPermissions: async () => {
      calls.push('request');
      return granted;
    },
    start: async (requestId, language) => {
      calls.push(`start:${requestId}:${language}`);
      return start;
    },
    stop: async (requestId) => void calls.push(`stop:${requestId}`),
    cancel: async (requestId) => void calls.push(`cancel:${requestId}`),
    listen: (cb) => {
      listener = cb;
      return { remove: () => void (listener = null) };
    },
  };
  type Heard = SpeechEvent extends infer E
    ? E extends SpeechEvent
      ? Omit<E, 'requestId'>
      : never
    : never;
  const emit = (event: Heard) => listener?.({ requestId: 'r1', ...event } as SpeechEvent);
  return { speech, calls, emit, listening: () => listener !== null };
}

function setup({
  speech = fakeSpeech(),
  results = [HEARD],
  access = ['given'],
  outcomes = ['given'],
}: {
  speech?: ReturnType<typeof fakeSpeech>;
  results?: CloudResult[];
  access?: PrepareResult[];
  outcomes?: AskOutcome[];
} = {}) {
  const sent: CloudRequest[] = [];
  const storage = memoryStorage();
  let consentPages = 0;
  let release: (() => void) | null = null;
  let hold = false;
  const call = async (request: CloudRequest) => {
    sent.push(request);
    if (hold) await new Promise<void>((resolve) => (release = resolve));
    return results.shift() ?? HEARD;
  };
  const consent = {
    prepare: async () => access.shift() ?? 'given',
    ask: () => ({ outcome: Promise.resolve(outcomes.shift() ?? 'declined') }),
  };
  const session = createAskSession({ call, consent, storage });
  session.open(USER);
  const voice = createVoice({
    speech: speech.speech,
    text: session,
    call,
    consent,
    newId: () => 'r1',
  });
  const detach = voice.attach({
    language: 'zh-Hans',
    openConsent: () => void (consentPages += 1),
  });
  return {
    ...speech,
    session,
    voice,
    detach,
    sent,
    storage,
    pages: () => consentPages,
    holdCalls: () => void (hold = true),
    releaseCall: () => release?.(),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('voice in the 问小貘 sheet', () => {
  test('the first tap explains before any system prompt; 好 asks, then listening starts', async () => {
    const speech = fakeSpeech({
      permissions: { microphone: 'undetermined', recognition: 'undetermined' },
    });
    const { voice, calls } = setup({ speech });
    await voice.tap();
    expect(voice.getSnapshot().phase).toBe('explain');
    expect(calls).toEqual([]);
    await voice.allow();
    expect(calls).toEqual(['request', 'start:r1:zh-Hans']);
    expect(voice.getSnapshot()).toMatchObject({ phase: 'listening', live: true });
  });

  test('a denied microphone shows the settings card and never starts', async () => {
    const denied = fakeSpeech({ permissions: { microphone: 'denied', recognition: 'granted' } });
    const first = setup({ speech: denied });
    await first.voice.tap();
    expect(first.voice.getSnapshot().phase).toBe('blocked');
    const refused = fakeSpeech({
      permissions: { microphone: 'undetermined', recognition: 'undetermined' },
      granted: { microphone: 'denied', recognition: 'undetermined' },
    });
    const second = setup({ speech: refused });
    await second.voice.tap();
    await second.voice.allow();
    expect(second.voice.getSnapshot().phase).toBe('blocked');
    expect(second.calls).toEqual(['request']);
  });

  test('on-device words fill the field live after what was typed, and nothing is sent', async () => {
    const { voice, session, emit, calls, sent } = setup();
    session.setText('帮我');
    await voice.tap();
    emit({ kind: 'partial', text: '明天' });
    expect(session.getSnapshot().text).toBe('帮我明天');
    emit({ kind: 'partial', text: '明天去 Pyramid' });
    expect(session.getSnapshot().text).toBe('帮我明天去 Pyramid');
    await voice.tap();
    expect(calls.at(-1)).toBe('stop:r1');
    emit({ kind: 'ended', engine: 'dictation', end: 'stopped', text: '明天去 Pyramid 取快递' });
    expect(session.getSnapshot().text).toBe('帮我明天去 Pyramid 取快递');
    expect(voice.getSnapshot()).toMatchObject({ phase: 'idle', note: null });
    expect(sent).toEqual([]);
  });

  test('a cloud recording asks for consent first, then its words fill the field and nothing else is sent', async () => {
    const speech = fakeSpeech({ start: { status: 'started', engine: 'cloud' } });
    const { voice, session, emit, sent, pages } = setup({
      speech,
      access: ['notGiven'],
      outcomes: ['given'],
    });
    await voice.tap();
    expect(voice.getSnapshot().live).toBe(false);
    emit({ kind: 'partial', text: 'ignored' });
    expect(session.getSnapshot().text).toBe('');
    emit({ kind: 'ended', engine: 'cloud', end: 'stopped', text: '', audio: AUDIO });
    await flush();
    expect(pages()).toBe(1);
    expect(sent).toEqual([
      {
        task: 'transcribe',
        input: { audio: { mediaType: 'audio/mp4', data: AUDIO }, language: 'zh-Hans' },
      },
    ]);
    expect(session.getSnapshot().text).toBe('明天帮我去 Pyramid 取快递');
    expect(voice.getSnapshot().phase).toBe('idle');
  });

  test('declining consent sends nothing and keeps the recording for one more try', async () => {
    const speech = fakeSpeech({ start: { status: 'started', engine: 'cloud' } });
    const { voice, emit, sent, session } = setup({
      speech,
      access: ['notGiven', 'given'],
      outcomes: ['declined'],
    });
    await voice.tap();
    emit({ kind: 'ended', engine: 'cloud', end: 'stopped', text: '', audio: AUDIO });
    await flush();
    expect(sent).toEqual([]);
    expect(voice.getSnapshot()).toMatchObject({ note: 'declined', canRetry: true });
    await voice.retry();
    expect(sent).toHaveLength(1);
    expect(session.getSnapshot().text).toBe('明天帮我去 Pyramid 取快递');
  });

  test.each([
    ['hungry', { kind: 'failed', error: 'hungry', status: 429 }, 'hungry'],
    ['busy', { kind: 'failed', error: 'busy', status: 409 }, 'busy'],
    ['a provider error', { kind: 'failed', error: 'provider_error', status: 502 }, 'failed'],
    ['no network', { kind: 'failed', error: null, status: null }, 'offline'],
    [
      'a reply that is not a transcript',
      { kind: 'answered', body: { tool: 'answer' } },
      'unreadable',
    ],
  ] as const)(
    '%s keeps the words as they were and offers a retry, never retrying alone',
    async (_name, result, note) => {
      const speech = fakeSpeech({ start: { status: 'started', engine: 'cloud' } });
      const { voice, emit, sent, session } = setup({ speech, results: [result as CloudResult] });
      session.setText('帮我');
      await voice.tap();
      emit({ kind: 'ended', engine: 'cloud', end: 'stopped', text: '', audio: AUDIO });
      await flush();
      expect(voice.getSnapshot()).toMatchObject({ phase: 'idle', note, canRetry: true });
      expect(session.getSnapshot().text).toBe('帮我');
      await flush();
      expect(sent).toHaveLength(1);
    },
  );

  test('an engine that fails mid-way takes its words back out and the whole recording goes to the cloud', async () => {
    const { voice, emit, session, sent } = setup();
    await voice.tap();
    emit({ kind: 'partial', text: '明天' });
    emit({ kind: 'fallback' });
    expect(session.getSnapshot().text).toBe('');
    expect(voice.getSnapshot().live).toBe(false);
    emit({ kind: 'ended', engine: 'dictation', end: 'engineFailed', text: '', audio: AUDIO });
    await flush();
    expect(sent).toHaveLength(1);
    expect(session.getSnapshot().text).toBe('明天帮我去 Pyramid 取快递');
  });

  test('silence says it heard nothing and spends nothing', async () => {
    const { voice, emit, sent } = setup();
    await voice.tap();
    emit({ kind: 'ended', engine: 'dictation', end: 'noSpeech', text: '' });
    expect(voice.getSnapshot().note).toBe('noSpeech');
    expect(sent).toEqual([]);
  });

  test('a microphone that cannot start says so and keeps the field', async () => {
    const speech = fakeSpeech({ start: { status: 'failed', code: 'audio' } });
    const { voice, session } = setup({ speech });
    session.setText('帮我');
    await voice.tap();
    expect(voice.getSnapshot()).toMatchObject({ phase: 'idle', note: 'micFailed' });
    expect(session.getSnapshot().text).toBe('帮我');
  });

  test('closing the sheet while listening cancels the recording and keeps the words heard so far', async () => {
    const { voice, emit, session, calls, detach, listening } = setup();
    await voice.tap();
    emit({ kind: 'partial', text: '明天' });
    detach();
    expect(calls.at(-1)).toBe('cancel:r1');
    expect(listening()).toBe(false);
    expect(session.getSnapshot().text).toBe('明天');
    expect(voice.getSnapshot().phase).toBe('idle');
  });

  test('words that land after the sheet closed go to the kept words for next time', async () => {
    const speech = fakeSpeech({ start: { status: 'started', engine: 'cloud' } });
    const { voice, emit, session, storage, detach, holdCalls, releaseCall } = setup({ speech });
    holdCalls();
    await voice.tap();
    emit({ kind: 'ended', engine: 'cloud', end: 'stopped', text: '', audio: AUDIO });
    await flush();
    detach();
    session.close();
    releaseCall();
    await flush();
    expect(storage.texts.get(USER)).toBe('明天帮我去 Pyramid 取快递');
  });

  test('a transcript that lands after sign-out is not written back for the same user', async () => {
    const speech = fakeSpeech({ start: { status: 'started', engine: 'cloud' } });
    const { voice, emit, session, storage, holdCalls, releaseCall } = setup({ speech });
    holdCalls();
    await voice.tap();
    emit({ kind: 'ended', engine: 'cloud', end: 'stopped', text: '', audio: AUDIO });
    await flush();
    session.forget(USER);
    voice.forget();
    session.open(USER);
    releaseCall();
    await flush();
    expect(storage.texts.get(USER)).toBe('');
    expect(session.getSnapshot().text).toBe('');
  });
});

describe('voice timing', () => {
  test('an event that arrives before the start answers is kept and replayed', async () => {
    const speech = fakeSpeech();
    const start = speech.speech.start;
    speech.speech.start = async (requestId, language) => {
      speech.emit({ kind: 'ended', engine: 'dictation', end: 'interrupted', text: '明天' });
      return start(requestId, language);
    };
    const { voice, session } = setup({ speech });
    await voice.tap();
    expect(session.getSnapshot().text).toBe('明天');
    expect(voice.getSnapshot().phase).toBe('idle');
  });

  test('再转一次 does nothing while a send is out', async () => {
    const speech = fakeSpeech({ start: { status: 'started', engine: 'cloud' } });
    const failed: CloudResult = { kind: 'failed', error: 'provider_error', status: 502 };
    const { voice, emit, sent, session, holdCalls } = setup({ speech, results: [failed] });
    await voice.tap();
    emit({ kind: 'ended', engine: 'cloud', end: 'stopped', text: '', audio: AUDIO });
    await flush();
    session.setText('帮我');
    holdCalls();
    void session.send(() => undefined);
    await flush();
    await voice.retry();
    expect(sent.map((request) => request.task)).toEqual(['transcribe', 'ask']);
    expect(voice.getSnapshot().canRetry).toBe(true);
  });
});

describe('voice helpers', () => {
  test.each([
    [{ microphone: 'undetermined', recognition: 'granted' }, 'explain'],
    [{ microphone: 'granted', recognition: 'undetermined' }, 'explain'],
    [{ microphone: 'denied', recognition: 'undetermined' }, 'blocked'],
    [{ microphone: 'granted', recognition: 'denied' }, 'ready'],
    [{ microphone: 'granted', recognition: 'granted' }, 'ready'],
  ] as const)('%o is %s', (permissions, access) => {
    expect(voiceAccess(permissions)).toBe(access);
  });

  test.each([
    ['', '明天取快递', '明天取快递'],
    ['帮我', '明天取快递', '帮我明天取快递'],
    ['Help me', 'pick up', 'Help me pick up'],
    ['帮我', 'pick up', '帮我 pick up'],
    ['Help me ', 'pick up', 'Help me pick up'],
    ['帮我', '   ', '帮我'],
  ])('%p and %p join as %p', (base, spoken, joined) => {
    expect(joinSpoken(base, spoken)).toBe(joined);
  });

  test('joined words stop at the field limit', () => {
    expect([...joinSpoken('字'.repeat(1999), '多说几个字')].length).toBe(2000);
  });
});
