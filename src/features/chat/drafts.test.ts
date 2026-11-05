import { describe, expect, test } from 'bun:test';

import { memorySettings } from './chatStoreHarness';
import { createDrafts } from './drafts';

describe('composer drafts', () => {
  test('a draft is kept per user and thread and survives a new instance', () => {
    const settings = memorySettings();
    createDrafts(settings).set('me', 't1', '我到楼下了');
    const again = createDrafts(settings);
    expect(again.get('me', 't1')).toBe('我到楼下了');
    expect(again.get('me', 't2')).toBe('');
    expect(again.get('other', 't1')).toBe('');
  });

  test('an emptied draft is removed and clearing a user drops all of theirs', () => {
    const settings = memorySettings();
    const drafts = createDrafts(settings);
    drafts.set('me', 't1', 'a');
    drafts.set('me', 't2', 'b');
    drafts.set('me', 't1', '');
    expect(createDrafts(settings).get('me', 't1')).toBe('');
    expect(createDrafts(settings).get('me', 't2')).toBe('b');
    drafts.clear('me');
    expect(createDrafts(settings).get('me', 't2')).toBe('');
  });

  test('unreadable stored drafts read as none', () => {
    const settings = memorySettings();
    settings.set({ 'tapiro.chatDrafts.me': '{nope' });
    expect(createDrafts(settings).get('me', 't1')).toBe('');
    settings.set({ 'tapiro.chatDrafts.me': JSON.stringify({ t1: 3 }) });
    expect(createDrafts(settings).get('me', 't1')).toBe('');
  });
});
