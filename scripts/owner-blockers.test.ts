import { describe, expect, test } from 'bun:test';

import {
  aiLines,
  iapLines,
  manualLines,
  pushLines,
  queryRows,
  secretLines,
  secretNames,
} from './owner-blockers.mjs';

const IDS = ['app.tapiro.coins.5', 'app.tapiro.coins.11'];

describe('owner blockers', () => {
  test('secret names are read without keeping values', () => {
    const names = secretNames(
      JSON.stringify([{ name: 'APNS_KEY_ID', value: 'digest', updated_at: '2026-11-20' }]),
    );
    expect(names).toEqual(['APNS_KEY_ID']);
  });

  test('a secrets answer that is not a list fails loudly', () => {
    expect(() => secretNames('{"error":"unauthorized"}')).toThrow('unexpected answer');
  });

  test('a missing APNs key blocks APNs and names the secret', () => {
    const lines = secretLines([
      'APNS_KEY_ID',
      'APNS_TEAM_ID',
      'MODEL_STUDIO_API_KEY',
      'MODEL_STUDIO_WORKSPACE_ID',
    ]);
    expect(lines).toEqual([
      'BLOCKED APNs secrets: hosted lacks APNS_PRIVATE_KEY',
      'OK      Model Studio secrets: hosted has MODEL_STUDIO_API_KEY, MODEL_STUDIO_WORKSPACE_ID',
    ]);
  });

  test('db query rows are unwrapped and a missing rows key fails', () => {
    expect(queryRows('{"boundary":"x","rows":[{"a":1}]}')).toEqual([{ a: 1 }]);
    expect(() => queryRows('{"message":"denied"}')).toThrow('unexpected answer');
  });

  test('no sent push blocks APNs delivery', () => {
    expect(pushLines([{ last_sent: null, sent: 0, failed: 4, tokens: 1 }])).toEqual([
      'BLOCKED APNs delivery: no push_queue row sent yet; 0 sent, 4 failed, 1 device tokens',
    ]);
  });

  test('a sent push quotes its time', () => {
    expect(pushLines([{ last_sent: '2026-11-21 12:33', sent: 16, failed: 2, tokens: 3 }])).toEqual([
      'OK      APNs delivery: last push_queue row sent 2026-11-21 12:33; 16 sent, 2 failed, 3 device tokens',
    ]);
  });

  test('model rows group per model with the latest time, and unseen tasks are named', () => {
    const lines = aiLines([
      { model: 'qwen-plus', task: 'ask', last_at: '2026-11-22', calls: 11 },
      { model: 'qwen-flash', task: 'translate', last_at: '2026-11-20', calls: 5 },
      { model: 'qwen-plus', task: 'draft_bounty', last_at: '2026-11-23', calls: 1 },
    ]);
    expect(lines).toEqual([
      'OK      Model Studio qwen-flash: last ai_metering row 2026-11-20; translate 5',
      'OK      Model Studio qwen-plus: last ai_metering row 2026-11-23; ask 11, draft_bounty 1',
      'NOT RUN Model Studio tasks: answer, transcribe, read_receipt never metered on a real model (not an owner blocker)',
    ]);
  });

  test('no metered call on a real model blocks Model Studio', () => {
    expect(aiLines([])).toEqual(['BLOCKED Model Studio calls: no ai_metering row on a real model']);
  });

  test('a product missing from App Store Connect blocks IAP', () => {
    const asc = [{ productId: IDS[0], type: 'CONSUMABLE', state: 'READY_TO_SUBMIT' }];
    expect(iapLines(IDS, asc)).toEqual([
      'BLOCKED IAP products: App Store Connect lacks app.tapiro.coins.11',
    ]);
  });

  test('present products quote their type and state', () => {
    const asc = IDS.map((productId) => ({ productId, type: 'CONSUMABLE', state: 'APPROVED' }));
    expect(iapLines(IDS, asc)).toEqual([
      'OK      IAP products: app.tapiro.coins.5 CONSUMABLE APPROVED, app.tapiro.coins.11 CONSUMABLE APPROVED',
    ]);
  });

  test('agreements are never guessed', () => {
    for (const text of manualLines()) expect(text.startsWith('CHECK ')).toBe(true);
  });
});
