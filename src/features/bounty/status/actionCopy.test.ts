import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import {
  cancelSheetCopy,
  closeSheetCopy,
  confirmSheetCopy,
  issueCount,
  issueReady,
} from './actionCopy';
import type { CancelPreview } from './types';

function copyFor(language: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng: language, initAsync: false, interpolation: { escapeValue: false } });
  return { t: i18n.t, language };
}

const zh = copyFor('zh-Hans');
const BACK = '2026-11-18T04:00:00.000Z';

describe('cancel sheet copy (ruling 5)', () => {
  test('the other side 30 minutes late puts it on them', () => {
    const copy = cancelSheetCopy({ offender: 'other' }, 'poster', '阿杰', zh);
    expect(copy).toEqual({
      title: '取消这单？',
      message: '阿杰过了约定时间 30 分钟还没出发，现在取消记在阿杰那边，不算你放鸽子。',
      confirm: '取消这单',
      keep: '不取消',
    });
  });

  test('a waiver left is used and nothing is recorded', () => {
    const preview: CancelPreview = { offender: 'self', waiverAvailable: true };
    expect(cancelSheetCopy(preview, 'poster', '阿杰', zh).message).toBe(
      '你已经选了阿杰，现在取消算一次放鸽子。你 60 天内还有 1 次豁免，这次用掉它，不记录。',
    );
    const helper = cancelSheetCopy(preview, 'helper', '小林', zh);
    expect(helper.title).toBe('不帮了？');
    expect(helper.message).toBe(
      '小林已经选了你，现在退出算一次放鸽子。你 60 天内还有 1 次豁免，这次用掉它，不记录。',
    );
    expect([helper.confirm, helper.keep]).toEqual(['不帮了', '继续帮']);
  });

  test('a used waiver is counted and says when it comes back', () => {
    const preview: CancelPreview = { offender: 'self', waiverAvailable: false, waiverBackAt: BACK };
    expect(cancelSheetCopy(preview, 'helper', '小林', zh).message).toBe(
      '小林已经选了你，现在退出会记一次放鸽子（60 天豁免已经用过，11月18日 恢复）。',
    );
    expect(cancelSheetCopy(preview, 'poster', 'Aiman', copyFor('en')).message).toBe(
      'You already chose Aiman, so cancelling now records a no-show (your 60-day waiver is used; it comes back on November 18).',
    );
  });

  test('a used waiver without a date still says it is counted', () => {
    const preview: CancelPreview = { offender: 'self', waiverAvailable: false, waiverBackAt: null };
    const message = cancelSheetCopy(preview, 'poster', '阿杰', zh).message;
    expect(message).toBe('你已经选了阿杰，现在取消会记一次放鸽子（60 天豁免已经用过）。');
  });
});

describe('close sheet copy (58A)', () => {
  test('says what comes back and who sees it', () => {
    expect(closeSheetCopy('free', 3, zh.t).message).toBe(
      '这单会从悬赏板上撤下，本月的免费次数退回给你。已经申请的 3 个人会看到这单关了。',
    );
    expect(closeSheetCopy('coin', 1, copyFor('en').t).message).toBe(
      'It comes off the board and your 1 coin comes back to you. The 1 applicant will see it was closed.',
    );
  });

  test('no applicants, or an unknown count, leaves the applicants out', () => {
    expect(closeSheetCopy('coin', 0, zh.t).message).toBe('这单会从悬赏板上撤下，1 貘币退回给你。');
    expect(closeSheetCopy('free', null, zh.t)).toEqual({
      title: '关掉这单？',
      message: '这单会从悬赏板上撤下，本月的免费次数退回给你。',
      confirm: '关掉这单',
      keep: '不关',
    });
  });
});

test('the confirm sheet states the amount (62A)', () => {
  expect(confirmSheetCopy('阿杰', 800, zh)).toEqual({
    title: '确认阿杰做完了？',
    message: '确认后就不能再说有问题了，接着付给阿杰 RM 8。',
    confirm: '确认完成',
    keep: '再看看',
  });
  expect(confirmSheetCopy('阿杰', 1250, zh).message).toContain('RM 12.50');
});

describe('issue reason', () => {
  test('needs one to 140 characters after trimming', () => {
    expect(issueReady('')).toBe(false);
    expect(issueReady('  \n ')).toBe(false);
    expect(issueReady('坏了')).toBe(true);
    expect(issueReady('字'.repeat(140))).toBe(true);
    expect(issueReady('字'.repeat(141))).toBe(false);
    expect(issueReady(` ${'字'.repeat(140)}  `)).toBe(true);
  });

  test('counts emoji as one character, as the server does', () => {
    expect(issueCount('杯子碎了😢')).toBe(5);
    expect(issueReady('😢'.repeat(140))).toBe(true);
  });
});
