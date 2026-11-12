import { parseAskReply, toRawReply, type PickItem } from './askReply';
import type { CloudCall, CloudImage, CloudResult } from './cloudGate';
import {
  keptConversation,
  requestText,
  storedForm,
  storedTurn,
  type Conversation,
  type Turn,
  type UserTurn,
} from './conversation';
import { askConsent, type ConsentGate } from './consentFlow';
import type { PrepareResult } from './consentStore';

export type AskFailure = 'offline' | 'providerError' | 'unreadable' | 'hungry' | 'busy';

export type AskSend = { user: UserTurn; image: CloudImage | null; typed: string | null };

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
  const forgets = new Map<string, number>();
  const forgetsOf = (userId: string) => forgets.get(userId) ?? 0;
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

  const consented = (openConsent: () => void): Promise<PrepareResult> =>
    askConsent(deps.consent, openConsent);

  async function run(send: AskSend, openConsent: () => void) {
    const { userId } = state;
    if (!userId || state.sending) return;
    const started = epoch;
    const forgetsAtSend = forgetsOf(userId);
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
    if (failure) return stop({ failed: { send, reason: failure } });
    const raw = result.kind === 'answered' ? toRawReply(result.body) : null;
    const reply = raw ? parseAskReply(raw) : null;
    if (!raw || !reply) return stop({ failed: { send, reason: 'unreadable' } });
    if (forgetsOf(userId) !== forgetsAtSend) return;

    const tapir = { role: 'tapir' as const, raw, reply };
    const late = !current();
    const base = late ? laterTurns(userId, turns) : turns;
    const next = [...base, send.user, tapir];
    const conversation = save(userId, next);
    const { typed } = send;
    if (typed !== null && deps.storage.readText(userId) === typed) {
      deps.storage.writeText(userId, '');
    }
    const text = typed !== null && state.text === typed ? '' : state.text;
    if (late) {
      if (state.userId !== userId) return;
      set({ text, ...(state.turns.length === 0 ? { resume: conversation } : {}) });
      return;
    }
    set({ sending: null, turns: next, text });
  }

  // A reply that lands after the sheet reopened joins whatever was saved since, when that grew from the same turns.
  function laterTurns(userId: string, sentFrom: Turn[]) {
    const saved = keptConversation(deps.storage.readConversation(userId), now())?.turns ?? null;
    if (!saved || saved.length < sentFrom.length) return sentFrom;
    const same = (a: Turn, b: Turn) =>
      JSON.stringify(storedTurn(a)) === JSON.stringify(storedTurn(b));
    return sentFrom.every((turn, index) => same(turn, saved[index])) ? saved : sentFrom;
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
      const user: UserTurn = { role: 'user', text, via: 'typed' };
      return run({ user, image: null, typed: state.text }, openConsent);
    },
    choose(answer: string, openConsent: () => void) {
      const user: UserTurn = { role: 'user', text: answer, via: 'choice' };
      return run({ user, image: null, typed: null }, openConsent);
    },
    sendImage(image: CloudImage, openConsent: () => void) {
      const user: UserTurn = { role: 'user', text: state.text.trim(), via: 'image' };
      return run({ user, image, typed: state.text }, openConsent);
    },
    fed() {
      if (state.failed?.reason === 'hungry') set({ failed: null });
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
      forgets.set(userId, forgetsOf(userId) + 1);
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
