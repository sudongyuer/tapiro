import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import {
  createFixtureStatusService,
  FIXTURE_REASON,
  STATUS_ROLES,
  STATUS_SCENARIOS,
  type StatusScenario,
} from './fixtureStatusService';
import {
  bareAmount,
  etaChangedText,
  lineText,
  stepLabel,
  stepText,
  summaryText,
} from './statusCopy';
import { timeline } from './timeline';
import type { StatusDetail, StatusRole } from './types';

const NOW = new Date(2026, 9, 29, 12, 0);

function copyFor(language: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng: language, initAsync: false, interpolation: { escapeValue: false } });
  return { t: i18n.t, language, now: NOW };
}

const zh = copyFor('zh-Hans');

async function detailOf(scenario: StatusScenario, role: StatusRole): Promise<StatusDetail> {
  const { service } = createFixtureStatusService({
    scenario,
    role,
    load: 'ok',
    waiver: 'available',
    now: () => NOW,
  });
  const detail = await service.detail('b1');
  if (detail === 'unavailable') throw new Error('unavailable');
  return detail;
}

describe('status copy', () => {
  test('the poster sees the new ETA, the old one and who changed it', async () => {
    const detail = await detailOf('enRouteChanged', 'poster');
    const started = timeline(detail, 'poster').steps[1];
    expect(stepText(started, zh)).toBe('阿杰出发了');
    const lines = started.lines.map((line) => [line.kind, lineText(line, zh), line.struck]);
    expect(lines).toEqual([
      ['eta', '预计 12:25 到', false],
      ['etaPrevious', '原来是 12:10', true],
    ]);
    expect(etaChangedText(detail, 'poster', zh)).toBe('阿杰 11:55 改了时间');
    expect(etaChangedText(detail, 'helper', zh)).toBe('你 11:55 改了时间');
  });

  test('done counts the hours to the auto confirmation', async () => {
    const detail = await detailOf('done', 'poster');
    const confirm = timeline(detail, 'poster').steps[3];
    expect(confirm.state).toBe('needsYou');
    expect(lineText(confirm.lines[0], zh)).toBe(
      '你不处理的话，10月31日 周六 11:50 自动确认（还有 48 小时）',
    );
  });

  test('the helper reads the poster’s reason when disputed', async () => {
    const detail = await detailOf('disputed', 'helper');
    const completed = timeline(detail, 'helper').steps[2];
    expect(completed.lines.map((line) => lineText(line, zh))).toEqual([
      `「${FIXTURE_REASON}」`,
      '处理好后再点完成，重新算 48 小时',
    ]);
    expect(summaryText(detail, 'helper', zh.t)).toBe('小林说有问题');
  });

  test('the late note counts the minutes past the agreed time', async () => {
    const detail = await detailOf('assignedLate', 'poster');
    const started = timeline(detail, 'poster').steps[1];
    expect(lineText(started.lines[0], zh)).toBe('约好 11:20 前出发，已过 40 分钟');
  });

  test('the payment step names the amount once', async () => {
    const poster = await detailOf('confirmed', 'poster');
    const helper = await detailOf('confirmed', 'helper');
    expect(stepText(timeline(poster, 'poster').steps[4], zh)).toBe('付给阿杰 RM 8');
    expect(stepText(timeline(helper, 'helper').steps[4], zh)).toBe('收 RM 8');
    expect(bareAmount(1250, 'en')).toBe('12.50');
  });

  test('the step label names its state', async () => {
    const detail = await detailOf('done', 'poster');
    const step = timeline(detail, 'poster').steps[0];
    expect(stepLabel(step, [stepText(step, zh), '11:00'], zh)).toBe('选好了阿杰，11:00，已完成');
  });

  test('every state and role renders without a missing key or placeholder', async () => {
    for (const language of ['zh-Hans', 'en', 'ms']) {
      const copy = copyFor(language);
      for (const scenario of STATUS_SCENARIOS) {
        for (const role of STATUS_ROLES) {
          if (scenario === 'open' && role === 'helper') continue;
          const detail = await detailOf(scenario, role);
          const texts = [
            summaryText(detail, role, copy.t) ?? '',
            etaChangedText(detail, role, copy) ?? '',
            ...timeline(detail, role).steps.flatMap((step) => [
              stepText(step, copy),
              ...step.lines.map((line) => lineText(line, copy)),
            ]),
          ];
          for (const text of texts) {
            expect(text).not.toContain('{{');
            expect(text).not.toContain('bounty.');
          }
        }
      }
    }
  });
});
