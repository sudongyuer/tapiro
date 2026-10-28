import { describe, expect, test } from 'bun:test';

import {
  createFixtureSelectService,
  fixtureSelectOptions,
  type FixtureSelectOptions,
  type SelectedArgs,
} from './fixtureSelectService';

const NOW = new Date('2026-10-28T04:00:00.000Z');

const fixture = (patch: Partial<FixtureSelectOptions> = {}) =>
  createFixtureSelectService({
    ...fixtureSelectOptions(
      () => undefined,
      () => NOW,
    ),
    ...patch,
  });

const list = async (service: ReturnType<typeof fixture>['service'], id = 'b1') => {
  const answer = await service.applicants(id);
  if (answer === 'gone') throw new Error('gone');
  return answer;
};

const codePoints = (text: string | null) => [...(text ?? '')].length;

test('launch arguments pick the set, the failure and the select mode', () => {
  const args: Record<string, string> = {
    uiVerifyApplicants: 'worst',
    uiVerifyApplicantsFail: 'refresh',
    uiVerifySelect: 'noPayee',
  };
  expect(fixtureSelectOptions((name) => args[name])).toMatchObject({
    applicants: 'worst',
    fail: 'refresh',
    select: 'noPayee',
  });
  expect(fixtureSelectOptions(() => 'nonsense')).toMatchObject({
    applicants: 'three',
    fail: 'none',
    select: 'ok',
  });
});

describe('applicants', () => {
  test('three: 阿杰, Hana, Aiman in application order with the drawn rows', async () => {
    const rows = await list(fixture().service);
    expect(rows.map((row) => [row.name, row.tier, row.helpedCount, row.note !== null])).toEqual([
      ['阿杰', 'very_reliable', 14, true],
      ['Hana', 'new_friend', 0, false],
      ['Aiman', 'reliable', 3, false],
    ]);
    const times = rows.map((row) => row.appliedAt);
    expect(times).toEqual([...times].sort());
    expect(new Set(rows.map((row) => row.status))).toEqual(new Set(['pending']));
  });

  test('none, one and fifty', async () => {
    expect(await list(fixture({ applicants: 'none' }).service)).toEqual([]);
    expect((await list(fixture({ applicants: 'one' }).service)).map((row) => row.name)).toEqual([
      '阿杰',
    ]);
    const fifty = await list(fixture({ applicants: 'fifty' }).service);
    expect(fifty).toHaveLength(50);
    expect(new Set(fifty.map((row) => row.id)).size).toBe(50);
  });

  test('worst carries 40-character names, 140-code-point notes, 貘友 and 128 helps', async () => {
    const rows = await list(fixture({ applicants: 'worst' }).service);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(codePoints(row.name)).toBe(40);
      expect(codePoints(row.note)).toBe(140);
      expect(row.note).toBe(row.note?.trim() ?? null);
      expect(row.name).toBe(row.name?.trim() ?? null);
      expect(row.tier).toBe('tapir_friend');
      expect(row.helpedCount).toBe(128);
    }
    expect(rows.some((row) => !row.note?.includes(' '))).toBe(true);
    expect(rows.some((row) => row.note?.includes(' '))).toBe(true);
  });

  test('first fails the first load once; refresh fails the second', async () => {
    const first = fixture({ fail: 'first' }).service;
    await expect(first.applicants('b1')).rejects.toThrow('Network');
    expect(await list(first)).toHaveLength(3);
    const refresh = fixture({ fail: 'refresh' }).service;
    expect(await list(refresh)).toHaveLength(3);
    await expect(refresh.applicants('b1')).rejects.toThrow('Network');
    expect(await list(refresh)).toHaveLength(3);
  });

  test('blocked applicants are hidden', async () => {
    const rows = await list(
      fixture({ isBlocked: (id) => id === 'fixture-applicant-hana' }).service,
    );
    expect(rows.map((row) => row.name)).toEqual(['阿杰', 'Aiman']);
  });
});

describe('select', () => {
  test('ok assigns, records the accepted arguments and answers the same for a repeat', async () => {
    const recorded: SelectedArgs[][] = [];
    const { service, posterView } = fixture({ onSelected: (args) => recorded.push(args) });
    expect(posterView('b1')).toBeNull();
    await list(service);
    expect(posterView('b1')).toEqual({ helper: null });
    expect(await service.select('b1', 'fixture-applicant-jie')).toEqual({
      ok: true,
      helperId: 'fixture-applicant-jie',
    });
    expect(await service.select('b1', 'fixture-applicant-jie')).toEqual({
      ok: true,
      helperId: 'fixture-applicant-jie',
    });
    expect(await service.select('b1', 'fixture-applicant-hana')).toEqual({
      ok: false,
      reason: 'taken',
    });
    expect(recorded.at(-1)).toEqual([
      { bounty: 'b1', applicant: 'fixture-applicant-jie' },
      { bounty: 'b1', applicant: 'fixture-applicant-jie' },
    ]);
    expect(await list(service)).toEqual([
      expect.objectContaining({ id: 'fixture-applicant-jie', status: 'selected' }),
    ]);
    expect(posterView('b1')).toEqual({
      helper: { id: 'fixture-applicant-jie', name: '阿杰', tier: 'very_reliable' },
    });
    expect(posterView('b2')).toBeNull();
  });

  test('every call counts as an attempt, rejected ones included', async () => {
    const attempts: number[] = [];
    const { service } = fixture({ select: 'noPayee', onAttempted: (n) => attempts.push(n) });
    await service.select('b1', 'fixture-applicant-jie');
    await service.select('b1', 'fixture-applicant-jie');
    expect(attempts).toEqual([1, 2]);
  });

  test('failOnce fails the first send only and records nothing for it', async () => {
    const recorded: SelectedArgs[][] = [];
    const { service } = fixture({ select: 'failOnce', onSelected: (args) => recorded.push(args) });
    expect(await service.select('b1', 'fixture-applicant-hana')).toEqual({
      ok: false,
      reason: 'failed',
    });
    expect(recorded).toEqual([]);
    expect(await service.select('b1', 'fixture-applicant-hana')).toEqual({
      ok: true,
      helperId: 'fixture-applicant-hana',
    });
  });

  test('lostAnswer commits the first select but answers failed; the list shows the helper', async () => {
    const recorded: SelectedArgs[][] = [];
    const { service, posterView } = fixture({
      select: 'lostAnswer',
      onSelected: (args) => recorded.push(args),
    });
    expect(await service.select('b1', 'fixture-applicant-hana')).toEqual({
      ok: false,
      reason: 'failed',
    });
    expect(recorded.at(-1)).toEqual([{ bounty: 'b1', applicant: 'fixture-applicant-hana' }]);
    expect(await list(service)).toEqual([
      expect.objectContaining({ id: 'fixture-applicant-hana', status: 'selected' }),
    ]);
    expect(posterView('b1')?.helper?.name).toBe('Hana');
    expect(await service.select('b1', 'fixture-applicant-jie')).toEqual({
      ok: false,
      reason: 'taken',
    });
    expect(await service.select('b1', 'fixture-applicant-hana')).toEqual({
      ok: true,
      helperId: 'fixture-applicant-hana',
    });
  });

  test('a failed first load still makes the user the poster', async () => {
    const { service, posterView } = fixture({ fail: 'first' });
    await expect(service.applicants('b1')).rejects.toThrow('Network');
    expect(posterView('b1')).toEqual({ helper: null });
  });

  test('taken: another device already chose 阿杰', async () => {
    const recorded: SelectedArgs[][] = [];
    const { service, posterView } = fixture({
      select: 'taken',
      onSelected: (args) => recorded.push(args),
    });
    expect(await service.select('b1', 'fixture-applicant-hana')).toEqual({
      ok: false,
      reason: 'taken',
    });
    expect(recorded).toEqual([]);
    expect(posterView('b1')?.helper?.name).toBe('阿杰');
    expect(await service.select('b1', 'fixture-applicant-jie')).toEqual({
      ok: true,
      helperId: 'fixture-applicant-jie',
    });
  });

  test('notPending drops the applicant from the list', async () => {
    const { service } = fixture({ select: 'notPending' });
    expect(await service.select('b1', 'fixture-applicant-hana')).toEqual({
      ok: false,
      reason: 'notPending',
    });
    expect((await list(service)).map((row) => row.name)).toEqual(['阿杰', 'Aiman']);
  });

  test.each(['noPayee', 'closed'] as const)('%s rejects and keeps the list', async (mode) => {
    const recorded: SelectedArgs[][] = [];
    const { service } = fixture({ select: mode, onSelected: (args) => recorded.push(args) });
    expect(await service.select('b1', 'fixture-applicant-hana')).toEqual({
      ok: false,
      reason: mode,
    });
    expect(await list(service)).toHaveLength(3);
    expect(recorded).toEqual([]);
  });

  test('an applicant who is not listed is notPending', async () => {
    const { service } = fixture();
    expect(await service.select('b1', 'someone-else')).toEqual({
      ok: false,
      reason: 'notPending',
    });
  });

  test('select waits for the write delay', async () => {
    const { service } = fixture({ writeDelayMs: 30 });
    const started = Date.now();
    await service.select('b1', 'fixture-applicant-jie');
    expect(Date.now() - started).toBeGreaterThanOrEqual(25);
  });
});

test('every not-selected seen mark is recorded, so a case can count them', async () => {
  let recorded: string[] = [];
  const { service } = fixture({ onSeen: (seen) => (recorded = seen) });
  await service.markNotSelectedSeen('b1');
  expect(recorded).toEqual(['b1']);
  await service.markNotSelectedSeen('b1');
  expect(recorded).toEqual(['b1', 'b1']);
});
