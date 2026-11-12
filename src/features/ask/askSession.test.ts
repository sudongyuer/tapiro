import { describe, expect, test } from 'bun:test';

import { createAskSession, type AskFailure, type AskStorage } from './askSession';
import type { CloudRequest, CloudResult } from './cloudGate';
import type { AskOutcome, PrepareResult } from './consentStore';

const NOW = new Date('2026-11-12T10:00:00.000Z');
const ANSWER: CloudResult = {
  kind: 'answered',
  body: { task: 'ask', tool: 'answer', result: { text: '按近 180 天算' } },
};
const CLARIFY: CloudResult = {
  kind: 'answered',
  body: { task: 'ask', tool: 'clarify', result: { question: '什么时候要？', choices: ['今晚'] } },
};
const DRAFT = {
  title: '明天帮搬家具',
  category: 'move',
  rewardMajor: 50,
  currency: null,
  description: null,
  deadlineAt: null,
  startsAt: null,
  endsAt: null,
  placeHint: null,
};
const PICK: CloudResult = {
  kind: 'answered',
  body: {
    tool: 'pick',
    result: {
      items: [
        { summary: '搬家具', draft: DRAFT },
        { summary: '取快递', draft: DRAFT },
      ],
    },
  },
};
const IMAGE = { mediaType: 'image/jpeg' as const, data: '/9j/AA==' };

function memoryStorage(): AskStorage & { texts: Map<string, string>; chats: Map<string, unknown> } {
  const texts = new Map<string, string>();
  const chats = new Map<string, unknown>();
  return {
    texts,
    chats,
    readText: (userId) => texts.get(userId) ?? '',
    writeText: (userId, text) => void texts.set(userId, text),
    readConversation: (userId) => chats.get(userId) ?? null,
    writeConversation: (userId, value) => void chats.set(userId, value),
  };
}

function setup({
  results = [ANSWER],
  access = ['given'],
  outcomes = ['given'],
}: {
  results?: CloudResult[];
  access?: PrepareResult[];
  outcomes?: AskOutcome[];
} = {}) {
  const sent: CloudRequest[] = [];
  const storage = memoryStorage();
  let consentPages = 0;
  const session = createAskSession({
    call: async (request) => {
      sent.push(request);
      return results.shift() ?? ANSWER;
    },
    consent: {
      prepare: async () => access.shift() ?? 'given',
      ask: () => ({ outcome: Promise.resolve(outcomes.shift() ?? 'declined') }),
    },
    storage,
    now: () => NOW,
  });
  const openConsent = () => {
    consentPages += 1;
  };
  session.open('u1');
  return { session, sent, storage, openConsent, pages: () => consentPages };
}

describe('the 问小貘 session', () => {
  test('typed words are kept on the device before anything is sent', () => {
    const { session, storage } = setup();
    session.setText('帮我取快递');
    expect(storage.texts.get('u1')).toBe('帮我取快递');
    session.open('u1');
    expect(session.getSnapshot().text).toBe('帮我取快递');
  });

  test('an answer joins the conversation and clears the field', async () => {
    const { session, sent, storage, openConsent } = setup();
    session.setText('靠谱度怎么涨？');
    await session.send(openConsent);
    expect(sent).toEqual([{ task: 'ask', input: { text: '靠谱度怎么涨？' } }]);
    const state = session.getSnapshot();
    expect(state.turns.map((turn) => turn.role)).toEqual(['user', 'tapir']);
    expect(state.text).toBe('');
    expect(storage.texts.get('u1')).toBe('');
    expect(state.sending).toBeNull();
  });

  test.each<[string, CloudResult, AskFailure]>([
    ['offline', { kind: 'failed', error: null, status: null }, 'offline'],
    ['an unknown status', { kind: 'unavailable' }, 'offline'],
    ['a provider error', { kind: 'failed', error: 'provider_error', status: 502 }, 'providerError'],
    ['an error with no body', { kind: 'failed', error: null, status: 500 }, 'providerError'],
    ['a server error', { kind: 'failed', error: 'server_error', status: 500 }, 'providerError'],
    ['an empty belly', { kind: 'failed', error: 'hungry', status: 429 }, 'hungry'],
    ['a call still running', { kind: 'failed', error: 'busy', status: 409 }, 'busy'],
    ['a reply the app cannot read', { kind: 'answered', body: { tool: 'answer' } }, 'unreadable'],
  ])(
    '%s keeps the words and offers a retry, never replayed on its own',
    async (_n, result, reason) => {
      const { session, sent, storage, openConsent } = setup({ results: [result] });
      session.setText('帮我取快递');
      await session.send(openConsent);
      const state = session.getSnapshot();
      expect(state.failed?.reason).toBe(reason);
      expect(state.text).toBe('帮我取快递');
      expect(storage.texts.get('u1')).toBe('帮我取快递');
      expect(state.turns).toEqual([]);
      expect(sent).toHaveLength(1);
      await session.retry(openConsent);
      expect(sent).toHaveLength(2);
      expect(session.getSnapshot().failed).toBeNull();
    },
  );

  test('feeding clears a hungry failure and sends nothing; the words wait for 发送', async () => {
    const { session, sent, openConsent } = setup({
      results: [{ kind: 'failed', error: 'hungry', status: 429 }],
    });
    session.setText('帮我取快递');
    await session.send(openConsent);
    session.fed();
    expect(session.getSnapshot().failed).toBeNull();
    expect(session.getSnapshot().text).toBe('帮我取快递');
    expect(sent).toHaveLength(1);
  });

  test('feeding leaves any other failure in place', async () => {
    const { session, openConsent } = setup({
      results: [{ kind: 'failed', error: 'provider_error', status: 502 }],
    });
    session.setText('帮我取快递');
    await session.send(openConsent);
    session.fed();
    expect(session.getSnapshot().failed?.reason).toBe('providerError');
  });

  test('the first send asks for consent, then sends once', async () => {
    const { session, sent, openConsent, pages } = setup({ access: ['notGiven'] });
    session.setText('帮我取快递');
    await session.send(openConsent);
    expect(pages()).toBe(1);
    expect(sent).toHaveLength(1);
  });

  test('declining sends nothing and keeps the words', async () => {
    const { session, sent, openConsent } = setup({ access: ['notGiven'], outcomes: ['declined'] });
    session.setText('帮我取快递');
    await session.send(openConsent);
    expect(sent).toEqual([]);
    expect(session.getSnapshot()).toMatchObject({
      text: '帮我取快递',
      failed: null,
      sending: null,
    });
  });

  test('consent withdrawn on another device asks again before the one resend', async () => {
    const { session, sent, openConsent, pages } = setup({
      results: [{ kind: 'consentRequired' }, ANSWER],
      access: ['given', 'notGiven'],
    });
    session.setText('帮我取快递');
    await session.send(openConsent);
    expect(pages()).toBe(1);
    expect(sent).toHaveLength(2);
    expect(session.getSnapshot().turns).toHaveLength(2);
  });

  test('consent withdrawn elsewhere and then declined sends nothing more', async () => {
    const { session, sent, openConsent } = setup({
      results: [{ kind: 'consentRequired' }],
      access: ['given', 'notGiven'],
      outcomes: ['declined'],
    });
    session.setText('帮我取快递');
    await session.send(openConsent);
    expect(sent).toHaveLength(1);
    expect(session.getSnapshot()).toMatchObject({ text: '帮我取快递', failed: null, turns: [] });
  });

  test('a newer consent version says to update and sends nothing', async () => {
    const { session, sent, openConsent } = setup({ access: ['needsUpdate'] });
    session.setText('x');
    await session.send(openConsent);
    expect(sent).toEqual([]);
    expect(session.getSnapshot().needsUpdate).toBe(true);
  });

  test('a button answer goes back with the question and keeps the typed field', async () => {
    const { session, sent, openConsent } = setup({ results: [CLARIFY, ANSWER] });
    session.setText('取快递');
    await session.send(openConsent);
    session.setText('别的');
    await session.choose('今晚', openConsent);
    expect(sent[1].input).toMatchObject({ text: '取快递\n什么时候要？ 今晚' });
    expect(session.getSnapshot().text).toBe('别的');
  });

  test('a screenshot sends its image and a picked item becomes a draft with no second call', async () => {
    const { session, sent, openConsent } = setup({ results: [PICK] });
    await session.sendImage(IMAGE, openConsent);
    expect(sent[0].input).toEqual({ text: '', image: IMAGE });
    const pick = session.getSnapshot().turns[1];
    if (pick.role !== 'tapir' || pick.reply.kind !== 'pick') throw new Error('no pick');
    session.pick(pick.reply.items[0]);
    const last = session.getSnapshot().turns.at(-1);
    expect(last?.role === 'tapir' && last.reply.kind).toBe('draft');
    expect(sent).toHaveLength(1);
  });

  test('each open is new and offers the last conversation for 7 days', async () => {
    const { session, openConsent } = setup();
    session.setText('靠谱度怎么涨？');
    await session.send(openConsent);
    session.open('u1');
    const state = session.getSnapshot();
    expect(state.turns).toEqual([]);
    expect(state.resume?.turns).toHaveLength(2);
    session.resume();
    expect(session.getSnapshot().turns).toHaveLength(2);
  });

  test('a reply that lands after the sheet reopened is kept as the last conversation', async () => {
    let release: (result: CloudResult) => void = () => {};
    const storage = memoryStorage();
    const session = createAskSession({
      call: () => new Promise((resolve) => (release = resolve)),
      consent: { prepare: async () => 'given', ask: () => ({ outcome: Promise.resolve('given') }) },
      storage,
      now: () => NOW,
    });
    session.open('u1');
    session.setText('靠谱度怎么涨？');
    const sending = session.send(() => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    session.open('u1');
    release(ANSWER);
    await sending;
    expect(session.getSnapshot().turns).toEqual([]);
    expect(session.getSnapshot().resume?.turns).toHaveLength(2);
  });

  test('signing out forgets the words and the conversation', async () => {
    const { session, storage, openConsent } = setup();
    session.setText('x?');
    await session.send(openConsent);
    session.setText('留着');
    session.forget('u1');
    expect(storage.texts.get('u1')).toBe('');
    expect(storage.chats.get('u1')).toBeNull();
    expect(session.getSnapshot().userId).toBeNull();
  });

  test('words ending in a newline still clear when the answer arrives', async () => {
    const { session, storage, openConsent } = setup();
    session.setText('取快递\n');
    await session.send(openConsent);
    expect(session.getSnapshot().text).toBe('');
    expect(storage.texts.get('u1')).toBe('');
  });

  test('a reply that lands after sign-out writes nothing back', async () => {
    let release: (result: CloudResult) => void = () => {};
    const storage = memoryStorage();
    const session = createAskSession({
      call: () => new Promise((resolve) => (release = resolve)),
      consent: { prepare: async () => 'given', ask: () => ({ outcome: Promise.resolve('given') }) },
      storage,
      now: () => NOW,
    });
    session.open('u1');
    session.setText('靠谱度怎么涨？');
    const sending = session.send(() => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    session.forget('u1');
    release(ANSWER);
    await sending;
    expect(storage.chats.get('u1')).toBeNull();
    expect(storage.texts.get('u1')).toBe('');
  });

  test('a reply sent before sign-out writes nothing back after the same user reopens the sheet', async () => {
    let release: (result: CloudResult) => void = () => {};
    const storage = memoryStorage();
    const session = createAskSession({
      call: () => new Promise((resolve) => (release = resolve)),
      consent: { prepare: async () => 'given', ask: () => ({ outcome: Promise.resolve('given') }) },
      storage,
      now: () => NOW,
    });
    session.open('u1');
    session.setText('靠谱度怎么涨？');
    const sending = session.send(() => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    session.forget('u1');
    session.open('u1');
    release(ANSWER);
    await sending;
    expect(storage.chats.get('u1')).toBeNull();
    expect(session.getSnapshot().resume).toBeNull();
  });

  test('a late reply clears the reopened field and joins what was saved since', async () => {
    const releases: ((result: CloudResult) => void)[] = [];
    const storage = memoryStorage();
    const session = createAskSession({
      call: () => new Promise((resolve) => releases.push(resolve)),
      consent: { prepare: async () => 'given', ask: () => ({ outcome: Promise.resolve('given') }) },
      storage,
      now: () => NOW,
    });
    session.open('u1');
    session.setText('first?');
    const first = session.send(() => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    session.open('u1');
    expect(session.getSnapshot().text).toBe('first?');
    releases[0](ANSWER);
    await first;
    expect(session.getSnapshot().text).toBe('');
    session.resume();
    session.setText('second?');
    const second = session.send(() => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    session.open('u1');
    session.resume();
    session.setText('third?');
    const third = session.send(() => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    releases[2](ANSWER);
    await third;
    releases[1](ANSWER);
    await second;
    const kept = session.getSnapshot().resume ?? null;
    const words = (storage.chats.get('u1') as { turns: { text?: string }[] }).turns
      .map((turn) => turn.text)
      .filter(Boolean);
    expect(words).toEqual(['first?', 'third?', 'second?']);
    expect(kept).toBeNull();
  });
});
