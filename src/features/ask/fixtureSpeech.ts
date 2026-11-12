import type { SpeechEvent, SpeechPermissions } from 'tapiro-kit';

import { FIXTURE_TRANSCRIPTS } from './fixtureAskReplies';
import type { SpeechService } from './voice';

export type FixtureVoice = 'undetermined' | 'granted' | 'denied' | 'refuse';
export type FixtureEngine = 'dictation' | 'cloud' | 'noSpeech' | 'fallback';

const FIXTURE_AUDIO = 'AAAAHGZ0eXBNNEEg';
const PARTIAL_MS = 500;

const PERMISSIONS: Record<FixtureVoice, SpeechPermissions> = {
  undetermined: { microphone: 'undetermined', recognition: 'undetermined' },
  refuse: { microphone: 'undetermined', recognition: 'undetermined' },
  granted: { microphone: 'granted', recognition: 'granted' },
  denied: { microphone: 'denied', recognition: 'undetermined' },
};

export function fixtureVoice(value: string | undefined): FixtureVoice {
  return value === 'granted' || value === 'denied' || value === 'refuse' ? value : 'undetermined';
}

export function fixtureEngine(value: string | undefined): FixtureEngine {
  return value === 'cloud' || value === 'noSpeech' || value === 'fallback' ? value : 'dictation';
}

export function partialsOf(words: string) {
  const parts = words.split(' ');
  return parts.map((_, index) => parts.slice(0, index + 1).join(' '));
}

export function createFixtureSpeech({
  voice,
  engine,
  onCall,
}: {
  voice: FixtureVoice;
  engine: FixtureEngine;
  onCall: (name: string, args: unknown) => void;
}): SpeechService {
  let permissions = PERMISSIONS[voice];
  const listeners = new Set<(event: SpeechEvent) => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>[]>();
  const shown = new Map<string, string>();
  const emit = (event: SpeechEvent) => listeners.forEach((listener) => listener(event));
  const clear = (requestId: string) => {
    timers.get(requestId)?.forEach(clearTimeout);
    timers.delete(requestId);
  };
  return {
    permissions: async () => permissions,
    async requestPermissions() {
      onCall('speechRequestPermissions', null);
      permissions =
        voice === 'refuse'
          ? { microphone: 'denied', recognition: 'undetermined' }
          : PERMISSIONS.granted;
      return permissions;
    },
    async start(requestId, language) {
      onCall('speechStart', { language });
      const words = FIXTURE_TRANSCRIPTS[language] ?? FIXTURE_TRANSCRIPTS['zh-Hans'];
      const live = engine === 'dictation' || engine === 'fallback';
      const pieces = live ? partialsOf(words) : [];
      timers.set(
        requestId,
        pieces.map((text, index) =>
          setTimeout(
            () => {
              shown.set(requestId, text);
              emit({ requestId, kind: 'partial', text });
              if (engine === 'fallback' && index === 1) emit({ requestId, kind: 'fallback' });
            },
            PARTIAL_MS * (index + 1),
          ),
        ),
      );
      return { status: 'started', engine: engine === 'cloud' ? 'cloud' : 'dictation' };
    },
    async stop(requestId) {
      onCall('speechStop', null);
      clear(requestId);
      const text = shown.get(requestId) ?? '';
      shown.delete(requestId);
      if (engine === 'cloud' || engine === 'fallback') {
        const end = engine === 'cloud' ? 'stopped' : 'engineFailed';
        const ended = { kind: 'ended', engine: engine === 'cloud' ? 'cloud' : 'dictation', end };
        emit({ requestId, ...ended, text: '', audio: FIXTURE_AUDIO } as SpeechEvent);
        return;
      }
      const end = engine === 'noSpeech' ? 'noSpeech' : 'stopped';
      emit({ requestId, kind: 'ended', engine: 'dictation', end, text });
    },
    async cancel(requestId) {
      onCall('speechCancel', null);
      clear(requestId);
      shown.delete(requestId);
    },
    listen(cb) {
      listeners.add(cb);
      return { remove: () => void listeners.delete(cb) };
    },
  };
}
