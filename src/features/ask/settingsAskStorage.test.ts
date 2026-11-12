import { describe, expect, test } from 'bun:test';

import { createSettingsAskStorage, createSettingsTranslationStorage } from './settingsAskStorage';

function fakeSettings() {
  const values = new Map<string, unknown>();
  return {
    values,
    get: (key: string) => values.get(key),
    set(next: Record<string, unknown>) {
      for (const [key, value] of Object.entries(next)) values.set(key, value);
    },
  };
}

describe('ask storage on the device', () => {
  test('keeps the typed words and the last conversation per user', () => {
    const settings = fakeSettings();
    const storage = createSettingsAskStorage(settings);
    storage.writeText('u1', '帮我取快递');
    storage.writeConversation('u1', { turns: [], updatedAt: 'x' });
    expect(storage.readText('u1')).toBe('帮我取快递');
    expect(storage.readText('u2')).toBe('');
    expect(storage.readConversation('u1')).toEqual({ turns: [], updatedAt: 'x' });
  });

  test('forgets with an empty string, never a null the property list would drop', () => {
    const settings = fakeSettings();
    const storage = createSettingsAskStorage(settings);
    storage.writeConversation('u1', { turns: [] });
    storage.writeConversation('u1', null);
    expect([...settings.values.values()]).not.toContain(null);
    expect(storage.readConversation('u1')).toBeNull();
  });

  test('a damaged value reads as nothing', () => {
    const settings = fakeSettings();
    settings.set({ 'tapiro.askConversation.u1': '{' });
    expect(createSettingsAskStorage(settings).readConversation('u1')).toBeNull();
  });

  test('keeps translations per user and forgets them with an empty string', () => {
    const settings = fakeSettings();
    const storage = createSettingsTranslationStorage(settings);
    const kept = [{ id: 'm2', to: 'zh-Hans' as const, text: '好', hidden: false }];
    storage.write('u1', kept);
    expect(storage.read('u1')).toEqual(kept);
    expect(storage.read('u2')).toBeNull();
    storage.write('u1', null);
    expect([...settings.values.values()]).not.toContain(null);
    expect(storage.read('u1')).toBeNull();
  });
});
