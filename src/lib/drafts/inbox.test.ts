import { describe, expect, test } from 'bun:test';

import type { BountyDraft } from './bountyDraft';
import { createDraftInbox, DRAFT_WAIT_MS } from './inbox';

const draft = (title: string): BountyDraft => ({
  title,
  category: null,
  rewardMajor: null,
  currency: null,
  description: null,
  time: { kind: 'none' },
  placeHint: null,
});

describe('draft inbox', () => {
  test('a draft is taken once', () => {
    const inbox = createDraftInbox();
    inbox.put('u1', draft('帮取快递'));
    expect(inbox.take('u1')?.title).toBe('帮取快递');
    expect(inbox.take('u1')).toBeNull();
  });

  test('another user never takes it', () => {
    const inbox = createDraftInbox();
    inbox.put('u1', draft('帮取快递'));
    expect(inbox.take('u2')).toBeNull();
    expect(inbox.take('u1')?.title).toBe('帮取快递');
  });

  test('a newer draft replaces one nobody took', () => {
    const inbox = createDraftInbox();
    inbox.put('u1', draft('first'));
    inbox.put('u1', draft('second'));
    expect(inbox.take('u1')?.title).toBe('second');
  });

  test('a waiting form hears a new draft, and clearing drops it', () => {
    const inbox = createDraftInbox();
    let heard = 0;
    const stop = inbox.subscribe(() => {
      heard += 1;
    });
    inbox.put('u1', draft('x'));
    stop();
    inbox.put('u1', draft('y'));
    expect(heard).toBe(1);
    inbox.clear('u1');
    expect(inbox.take('u1')).toBeNull();
  });

  test('a draft no form took in time is dropped', () => {
    let clock = 0;
    const inbox = createDraftInbox(() => clock);
    inbox.put('u1', draft('x'));
    clock = DRAFT_WAIT_MS + 1;
    expect(inbox.take('u1')).toBeNull();
  });
});
