import { describe, expect, test } from 'bun:test';

import { toDraft } from './draftStore';
import { createSettingsDraftStorage, type SettingsLike } from './settingsDraftStorage';
import type { PostDraft } from './types';

function propertyListSettings(): SettingsLike & { raw: Record<string, unknown> } {
  const raw: Record<string, unknown> = {};
  return {
    raw,
    get: (key) => raw[key],
    set(values) {
      for (const [key, value] of Object.entries(values)) {
        if (value === null || value === undefined) continue;
        raw[key] = typeof value === 'object' ? structuredClone(dropNulls(value)) : value;
      }
    },
  };
}

function dropNulls(value: object): object {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== null));
}

const DRAFT: PostDraft = {
  id: 'draft-1',
  title: '帮我取个快递',
  category: 'pickup',
  art: null,
  rewardText: '8',
  currency: 'MYR',
  description: null,
  time: { kind: 'none' },
  place: null,
  updatedAt: '2026-10-27T09:00:00.000Z',
};

describe('Settings draft storage', () => {
  test('a stored draft reads back whole, null fields included', () => {
    const storage = createSettingsDraftStorage(propertyListSettings());
    storage.write('u1', DRAFT);
    expect(toDraft(storage.read('u1'))).toEqual(DRAFT);
  });

  test('clearing really removes the draft from a store that drops nulls', () => {
    const settings = propertyListSettings();
    const storage = createSettingsDraftStorage(settings);
    storage.write('u1', DRAFT);
    storage.write('u1', null);
    expect(storage.read('u1')).toBeNull();
    expect(settings.raw['tapiro.bountyDraft.u1']).toBe('');
  });

  test('drafts are kept per user', () => {
    const storage = createSettingsDraftStorage(propertyListSettings());
    storage.write('u1', DRAFT);
    expect(storage.read('u2')).toBeNull();
  });

  test('a corrupt value reads as no draft', () => {
    const settings = propertyListSettings();
    settings.raw['tapiro.bountyDraft.u1'] = '{"id":';
    expect(createSettingsDraftStorage(settings).read('u1')).toBeNull();
  });
});
