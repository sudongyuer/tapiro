import type { SpeechEvent, SpeechPermissions, SpeechStartResult } from 'tapiro-kit';

import { askConsent, type ConsentGate } from './askSession';
import type { CloudCall, CloudResult } from './cloudGate';

export type SpeechService = {
  permissions(): Promise<SpeechPermissions>;
  requestPermissions(): Promise<SpeechPermissions>;
  start(requestId: string, language: string): Promise<SpeechStartResult>;
  stop(requestId: string): Promise<void>;
  cancel(requestId: string): Promise<void>;
  listen(cb: (event: SpeechEvent) => void): { remove(): void };
};

export type VoiceText = {
  getSnapshot(): { userId: string | null; text: string; sending: unknown };
  generation(userId: string): number;
  writeFor(userId: string, since: number, next: (text: string) => string): boolean;
};

export type VoicePhase = 'idle' | 'explain' | 'blocked' | 'starting' | 'listening' | 'transcribing';

export type VoiceNote =
  | 'noSpeech'
  | 'micFailed'
  | 'failed'
  | 'offline'
  | 'hungry'
  | 'busy'
  | 'declined'
  | 'needsUpdate'
  | 'unreadable'
  | 'notPlaced';

export type VoiceState = {
  phase: VoicePhase;
  live: boolean;
  note: VoiceNote | null;
  canRetry: boolean;
};

type Take = { requestId: string; userId: string; since: number; base: string };

const IDLE: VoiceState = { phase: 'idle', live: false, note: null, canRetry: false };

const TEXT_MAX = 2000;

export function voiceAccess(permissions: SpeechPermissions): 'ready' | 'explain' | 'blocked' {
  if (permissions.microphone === 'denied') return 'blocked';
  if (permissions.microphone === 'undetermined' || permissions.recognition === 'undetermined') {
    return 'explain';
  }
  return 'ready';
}

const LATIN = /[\p{Script=Latin}\p{Nd}]/u;

export function joinSpoken(base: string, spoken: string) {
  const words = spoken.trim();
  if (words === '') return base;
  if (base.trim() === '') return [...words].slice(0, TEXT_MAX).join('');
  const last = [...base].at(-1) ?? '';
  const first = [...words][0] ?? '';
  const spaced = /\s/.test(last) || !(LATIN.test(last) || LATIN.test(first)) ? '' : ' ';
  return [...`${base}${spaced}${words}`].slice(0, TEXT_MAX).join('');
}

function transcriptOf(body: unknown): string | null {
  const reply = body as { tool?: unknown; result?: { text?: unknown } } | null;
  if (reply?.tool !== 'transcript' || typeof reply.result?.text !== 'string') return null;
  return reply.result.text;
}

function noteOf(result: CloudResult): VoiceNote {
  if (result.kind === 'needsUpdate') return 'needsUpdate';
  if (result.kind === 'unavailable') return 'offline';
  if (result.kind === 'consentRequired') return 'declined';
  if (result.kind !== 'failed') return 'unreadable';
  if (result.error === 'hungry' || result.error === 'busy') return result.error;
  return result.status === null ? 'offline' : 'failed';
}

export function createVoice(deps: {
  speech: SpeechService;
  text: VoiceText;
  call: CloudCall;
  consent: ConsentGate;
  newId?: () => string;
}) {
  let state = IDLE;
  let take: Take | null = null;
  let early: { requestId: string; events: SpeechEvent[] } | null = null;
  let retry: { audio: string; take: Take } | null = null;
  let language = 'zh-Hans';
  let openConsent: () => void = () => undefined;
  let epoch = 0;
  let ids = 0;
  const newId = deps.newId ?? (() => `voice-${Date.now()}-${(ids += 1)}`);
  const listeners = new Set<() => void>();

  const set = (next: Partial<VoiceState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  const write = (at: Take, next: (text: string) => string) =>
    deps.text.writeFor(at.userId, at.since, next);

  async function begin() {
    const userId = deps.text.getSnapshot().userId;
    if (!userId) return set(IDLE);
    const started = epoch;
    const requestId = newId();
    set({ phase: 'starting', note: null, canRetry: false, live: false });
    retry = null;
    early = { requestId, events: [] };
    const result = await deps.speech
      .start(requestId, language)
      .catch((): SpeechStartResult => ({ status: 'failed', code: 'unknown' }));
    // Events travel apart from the start's answer, so one can arrive before it; it is held and replayed.
    const held = early?.requestId === requestId ? early.events : [];
    if (early?.requestId === requestId) early = null;
    if (epoch !== started) {
      if (result.status === 'started') void deps.speech.cancel(requestId);
      return;
    }
    if (result.status === 'failed') {
      return set(
        result.code === 'micDenied' ? { phase: 'blocked' } : { ...IDLE, note: 'micFailed' },
      );
    }
    take = {
      requestId,
      userId,
      since: deps.text.generation(userId),
      base: deps.text.getSnapshot().text,
    };
    set({ phase: 'listening', live: result.engine !== 'cloud' });
    held.forEach(heard);
  }

  async function transcribe(audio: string, at: Take) {
    const started = epoch;
    set({ phase: 'transcribing', note: null, canRetry: false, live: false });
    const fail = (note: VoiceNote) => {
      if (epoch !== started) return;
      retry = { audio, take: at };
      set({ ...IDLE, note, canRetry: true });
    };
    let access = await askConsent(deps.consent, openConsent);
    if (epoch !== started) return;
    if (access !== 'given') return fail(access === 'notGiven' ? 'declined' : access);
    const request = {
      task: 'transcribe' as const,
      input: { audio: { mediaType: 'audio/mp4' as const, data: audio }, language },
    };
    let result = await deps.call(request);
    if (result.kind === 'consentRequired') {
      access = await askConsent(deps.consent, openConsent);
      if (epoch !== started) return;
      if (access !== 'given') return fail(access === 'notGiven' ? 'declined' : access);
      result = await deps.call(request);
    }
    const words = result.kind === 'answered' ? transcriptOf(result.body) : null;
    if (words === null) return fail(noteOf(result));
    const placed = words.trim() === '' || write(at, (text) => joinSpoken(text, words));
    if (epoch !== started) return;
    if (!placed) return fail('notPlaced');
    set({ ...IDLE, note: words.trim() === '' ? 'noSpeech' : null });
  }

  function heard(event: SpeechEvent) {
    const at = take;
    if (!at) {
      if (early?.requestId === event.requestId) early.events.push(event);
      return;
    }
    if (event.requestId !== at.requestId) return;
    if (event.kind === 'partial') {
      if (state.live) write(at, () => joinSpoken(at.base, event.text));
      return;
    }
    if (event.kind === 'fallback') {
      write(at, () => at.base);
      return set({ live: false });
    }
    take = null;
    if (event.audio) {
      write(at, () => at.base);
      return void transcribe(event.audio, at);
    }
    if (event.end === 'audioFailed') return set({ ...IDLE, note: 'micFailed' });
    const words = event.text.trim();
    if (words !== '') write(at, () => joinSpoken(at.base, words));
    set({ ...IDLE, note: words === '' ? 'noSpeech' : null });
  }

  function stopListening() {
    epoch += 1;
    const at = take;
    take = null;
    retry = null;
    const starting = early;
    early = null;
    if (at) void deps.speech.cancel(at.requestId);
    else if (starting) void deps.speech.cancel(starting.requestId);
    set(IDLE);
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    attach(options: { language: string; openConsent: () => void }) {
      language = options.language;
      openConsent = options.openConsent;
      const subscription = deps.speech.listen(heard);
      return () => {
        subscription.remove();
        stopListening();
      };
    },
    async tap() {
      if (state.phase === 'listening') {
        if (take) await deps.speech.stop(take.requestId);
        return;
      }
      if (state.phase === 'starting' || state.phase === 'transcribing') return;
      const started = epoch;
      const permissions = await deps.speech.permissions().catch(() => null);
      if (epoch !== started) return;
      if (!permissions) return set({ ...IDLE, note: 'micFailed' });
      const access = voiceAccess(permissions);
      if (access === 'ready') return begin();
      set({ ...IDLE, phase: access });
    },
    async allow() {
      if (state.phase !== 'explain') return;
      const started = epoch;
      const permissions = await deps.speech.requestPermissions().catch(() => null);
      if (epoch !== started) return;
      if (permissions?.microphone !== 'granted') return set({ ...IDLE, phase: 'blocked' });
      return begin();
    },
    retry() {
      if (!retry || state.phase !== 'idle' || deps.text.getSnapshot().sending) {
        return Promise.resolve();
      }
      const { audio, take: at } = retry;
      retry = null;
      return transcribe(audio, at);
    },
    dismiss() {
      if (state.phase === 'explain' || state.phase === 'blocked' || state.note) {
        retry = null;
        set(IDLE);
      }
    },
    forget: stopListening,
  };
}

export type Voice = ReturnType<typeof createVoice>;
