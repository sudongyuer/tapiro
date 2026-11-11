import { parseAskReply, toRawReply, type PickItem } from './askReply';
import type { CloudCall, CloudImage, CloudResult } from './cloudGate';
import {
  keptConversation,
  requestText,
  storedForm,
  type Conversation,
  type Turn,
  type UserTurn,
} from './conversation';
import type { AskOutcome, PrepareResult } from './consentStore';

export type AskFailure = 'offline' | 'providerError' | 'hungry' | 'busy';

export type AskSend = { user: UserTurn; image: CloudImage | null };

export type AskSessionState = {
  userId: string | null;
  turns: Turn[];
  resume: Conversation | null;
  text: string;
  sending: AskSend | null;
  failed: { send: AskSend; reason: AskFailure } | null;
  needsUpdate: boolean;
};

export type AskStorage = {
  readText(userId: string): string;
  writeText(userId: string, text: string): void;
  readConversation(userId: string): unknown;
  writeConversation(userId: string, conversation: unknown): void;
};

export type ConsentGate = {
  prepare(): Promise<PrepareResult>;
  ask(): { outcome: Promise<AskOutcome> };
};

const EMPTY: AskSessionState = {
  userId: null,
  turns: [],
  resume: null,
  text: '',
  sending: null,
  failed: null,
  needsUpdate: false,
};

function failureOf(result: CloudResult): AskFailure | 'needsUpdate' | null {
  if (result.kind === 'needsUpdate') return 'needsUpdate';
  if (result.kind === 'unavailable') return 'offline';
  if (result.kind !== 'failed') return null;
  if (result.error === 'hungry' || result.error === 'busy') return result.error;
  return result.status === null ? 'offline' : 'providerError';
}

export function createAskSession(deps: {
  call: CloudCall;
  consent: ConsentGate;
  storage: AskStorage;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  let state = EMPTY;
  let epoch = 0;
  const listeners = new Set<() => void>();

  const set = (next: Partial<AskSessionState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  function save(userId: string, turns: Turn[]) {
    const conversation: Conversation = { turns, updatedAt: now().toISOString() };
    deps.storage.writeConversation(userId, storedForm(conversation));
    return conversation;
  }

  async function consented(openConsent: () => void): Promise<PrepareResult> {
    const access = await deps.consent.prepare();
    if (access !== 'notGiven') return access;
    const asked = deps.consent.ask();
    openConsent();
    const outcome = await asked.outcome;
    return outcome === 'declined' ? 'notGiven' : outcome;
  }

  async function run(send: AskSend, openConsent: () => void) {
    const { userId } = state;
    if (!userId || state.sending) return;
    const started = epoch;
    const turns = state.turns;
    set({ sending: send, failed: null, needsUpdate: false });
    const current = () => state.userId === userId && epoch === started;
    const stop = (next: Partial<AskSessionState>) => {
      if (current()) set({ sending: null, ...next });
    };

    let access = await consented(openConsent);
    if (access === 'offline') return stop({ failed: { send, reason: 'offline' } });
    if (access === 'needsUpdate') return stop({ needsUpdate: true });
    if (access === 'notGiven') return stop({});

    const request = {
      task: 'ask' as const,
      input: {
        text: requestText(turns, send.user),
        ...(send.image ? { image: send.image } : {}),
      },
    };
    let result = await deps.call(request);
    if (result.kind === 'consentRequired') {
      access = await consented(openConsent);
      if (access !== 'given') {
        const failed = access === 'offline' ? { send, reason: 'offline' as const } : null;
        return stop({ failed, needsUpdate: access === 'needsUpdate' });
      }
      result = await deps.call(request);
    }
    if (result.kind === 'consentRequired') return stop({});
    const failure = failureOf(result);
    if (failure === 'needsUpdate') return stop({ needsUpdate: true });
    const raw = result.kind === 'answered' ? toRawReply(result.body) : null;
    const reply = raw ? parseAskReply(raw) : null;
    if (failure || !raw || !reply) {
      return stop({ failed: { send, reason: failure ?? 'providerError' } });
    }

    const next = [...turns, send.user, { role: 'tapir' as const, raw, reply }];
    const conversation = save(userId, next);
    const sentText = send.user.via === 'choice' ? null : send.user.text;
    if (sentText !== null && deps.storage.readText(userId) === sentText) {
      deps.storage.writeText(userId, '');
    }
    if (!current()) {
      if (state.userId === userId && state.turns.length === 0) set({ resume: conversation });
      return;
    }
    set({
      sending: null,
      turns: next,
      text: sentText !== null && state.text === sentText ? '' : state.text,
    });
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    open(userId: string) {
      epoch += 1;
      state = {
        ...EMPTY,
        userId,
        text: deps.storage.readText(userId),
        resume: keptConversation(deps.storage.readConversation(userId), now()),
      };
      listeners.forEach((listener) => listener());
    },
    close() {
      epoch += 1;
      set(EMPTY);
    },
    setText(text: string) {
      if (!state.userId || state.sending) return;
      deps.storage.writeText(state.userId, text);
      set({ text, failed: null, needsUpdate: false });
    },
    resume() {
      if (!state.resume || state.sending) return;
      set({ turns: state.resume.turns, resume: null, failed: null });
    },
    send(openConsent: () => void) {
      const text = state.text.trim();
      if (text === '') return Promise.resolve();
      return run({ user: { role: 'user', text, via: 'typed' }, image: null }, openConsent);
    },
    choose(answer: string, openConsent: () => void) {
      return run({ user: { role: 'user', text: answer, via: 'choice' }, image: null }, openConsent);
    },
    sendImage(image: CloudImage, openConsent: () => void) {
      const text = state.text.trim();
      return run({ user: { role: 'user', text, via: 'image' }, image }, openConsent);
    },
    retry(openConsent: () => void) {
      return state.failed ? run(state.failed.send, openConsent) : Promise.resolve();
    },
    pick(item: PickItem) {
      const { userId } = state;
      if (!userId || state.sending) return;
      const turns: Turn[] = [
        ...state.turns,
        { role: 'user', text: item.summary, via: 'choice' },
        {
          role: 'tapir',
          raw: { tool: 'draft_bounty', result: item.raw },
          reply: { kind: 'draft', draft: item.draft },
        },
      ];
      save(userId, turns);
      set({ turns });
    },
    forget(userId: string) {
      deps.storage.writeText(userId, '');
      deps.storage.writeConversation(userId, null);
      if (state.userId === userId) {
        epoch += 1;
        set(EMPTY);
      }
    },
  };
}

export type AskSession = ReturnType<typeof createAskSession>;
