import { describe, expect, test } from 'bun:test';

import {
  checkStoryMap,
  parseCoverage,
  parseStoryMap,
  quotedNames,
  summarize,
} from './check-story-map.mjs';

const files: Record<string, string> = {
  'docs/specs/a.md': '',
  'verification/ui/cases/payee_list.py': '',
  'verification/ui/cases/orphan.py': '',
  'src/features/payee/validate.test.ts':
    "test('is required', () => {});\ntest('caps at 60 characters, trimmed', () => {});",
  'verification/ui/helper.py': 'def walk_home(ui):\n    pass\n',
  'supabase/tests/payee_methods.test.sql': '',
};
const fs = {
  exists: (path: string) => path in files,
  read: (path: string) => files[path] ?? '',
  uiCases: ['orphan', 'payee_list'],
};

function story(
  id: string,
  status: string,
  rows: string[],
  { release = 'v1', spec = '[a](specs/a.md)' } = {},
) {
  return [
    `### ${id} 标题`,
    '',
    '- 故事：作为同学，我想加一个方式，以便收钱。',
    `- 状态：${status}`,
    `- 版本：${release}`,
    `- 规格：${spec}`,
    '',
    '| 验收 id | 行为 | 覆盖 |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

function map(...stories: string[]) {
  return ['# 用户故事地图', '', '## 写法', '', '- 说明', '', '## 收款方式', '', ...stories].join(
    '\n',
  );
}

const check = (text: string) => checkStoryMap(text, fs);

describe('parse', () => {
  test('reads activities, stories, fields and criteria', () => {
    const [activity] = parseStoryMap(
      map(story('payee.add', 'done', ['| payee.add.name | 名字必填 | ui:payee_list, device |'])),
    );
    expect(activity.name).toBe('收款方式');
    const [s] = activity.stories;
    expect(s).toMatchObject({ id: 'payee.add', status: 'done', release: 'v1', title: '标题' });
    expect(s.criteria[0].coverage.map((c: { kind: string }) => c.kind)).toEqual(['ui', 'device']);
  });

  test('a heading without stories is not an activity', () => {
    expect(parseStoryMap(map()).length).toBe(0);
  });

  test('coverage tokens keep targets, fragments, notes and reasons', () => {
    expect(
      parseCoverage(
        'unit:src/a.test.ts#is required, device: 真机看, gap: 没有用例，以后补, ui, db:supabase/tests/x.sql',
      ),
    ).toEqual([
      {
        kind: 'unit',
        target: 'src/a.test.ts',
        fragment: 'is required',
        raw: 'unit:src/a.test.ts#is required',
      },
      { kind: 'device', note: '真机看', raw: 'device: 真机看' },
      { kind: 'gap', reason: '没有用例，以后补', raw: 'gap: 没有用例，以后补' },
      { kind: 'ui', target: null, planned: true, raw: 'ui' },
      {
        kind: 'db',
        target: 'supabase/tests/x.sql',
        fragment: null,
        raw: 'db:supabase/tests/x.sql',
      },
    ]);
    expect(parseCoverage('—')).toEqual([]);
  });
});

describe('check', () => {
  test('a fully covered done story passes', () => {
    const result = check(
      map(
        story('payee.add', 'done', [
          '| payee.add.name | 名字必填 | ui:payee_list, unit:src/features/payee/validate.test.ts#is required |',
          '| payee.add.db | 只有自己能看 | db:supabase/tests/payee_methods.test.sql |',
          '| payee.add.real | 真机扫码 | device: 用相机扫 |',
        ]),
      ),
    );
    expect(result.errors).toEqual([]);
    expect(result.device.map((d) => d.criterion.id)).toEqual(['payee.add.real']);
  });

  test('a done criterion without coverage fails', () => {
    expect(
      check(map(story('payee.add', 'done', ['| payee.add.name | 名字必填 | — |']))).errors,
    ).toEqual([expect.stringContaining('payee.add.name (done) has no coverage')]);
  });

  test('a bare gap on a done story fails, a reasoned gap is acknowledged', () => {
    const bare = check(map(story('payee.add', 'done', ['| payee.add.name | 名字必填 | gap |'])));
    expect(bare.errors).toEqual([expect.stringContaining('bare gap')]);
    const reasoned = check(
      map(story('payee.add', 'done', ['| payee.add.name | 名字必填 | gap: 没有用例 |'])),
    );
    expect(reasoned.errors).toEqual([]);
    expect(reasoned.gaps.map((g) => g.reason)).toEqual(['没有用例']);
  });

  test('a kind without a target is allowed only before the story is done', () => {
    expect(
      check(map(story('pay.sheet', 'planned', ['| pay.sheet.copy | 复制 | ui, unit |']))).errors,
    ).toEqual([]);
    expect(
      check(map(story('pay.sheet', 'done', ['| pay.sheet.copy | 复制 | ui |']))).errors,
    ).toEqual([expect.stringContaining('names "ui" without a target')]);
  });

  test('missing cases, files and test names fail', () => {
    const { errors } = check(
      map(
        story('payee.add', 'done', [
          '| payee.add.a | 甲 | ui:nope |',
          '| payee.add.b | 乙 | unit:src/missing.test.ts |',
          '| payee.add.c | 丙 | unit:src/features/payee/validate.test.ts#caps at 60 |',
        ]),
      ),
    );
    expect(errors).toEqual([
      expect.stringContaining('missing UI case nope'),
      expect.stringContaining('missing file src/missing.test.ts'),
      expect.stringContaining('has no test or quoted name exactly "caps at 60"'),
    ]);
  });

  test('malformed and duplicate ids fail', () => {
    const { errors } = check(
      map(
        story('Payee', 'planned', ['| Payee.x | 甲 | ui |']),
        story('payee.add', 'planned', ['| payee.other.x | 乙 | ui |', '| payee.add.y | 丙 | ui |']),
        story('payee.add', 'planned', ['| payee.add.y | 丁 | ui |']),
      ),
    );
    expect(errors).toEqual([
      expect.stringContaining('malformed story id "Payee"'),
      expect.stringContaining('Payee.x is malformed'),
      expect.stringContaining('payee.other.x is malformed'),
      expect.stringContaining('duplicate story id "payee.add"'),
      expect.stringContaining('payee.add.y is a duplicate criterion id'),
    ]);
  });

  test('bad status, release, spec and unknown coverage fail', () => {
    const { errors } = check(
      map(
        story('payee.add', 'shipped', ['| payee.add.a | 甲 | maybe |'], {
          release: 'soon',
          spec: '[x](specs/missing.md)',
        }),
      ),
    );
    expect(errors).toEqual([
      expect.stringContaining('status "shipped"'),
      expect.stringContaining('release "soon"'),
      expect.stringContaining('spec specs/missing.md does not exist'),
      expect.stringContaining('unknown coverage "maybe"'),
    ]);
  });

  test('warns about an unreferenced UI case and a planned story without criteria', () => {
    const result = check(
      map(
        story('payee.add', 'done', ['| payee.add.a | 甲 | ui:payee_list |']),
        story('ride.board', 'planned', []),
      ),
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      expect.stringContaining('planned story ride.board has no acceptance criteria'),
      'UI case orphan is referenced by no criterion',
    ]);
  });

  test('the summary lists counts, gaps and the device checklist', () => {
    const text = summarize(
      check(
        map(
          story('payee.add', 'done', [
            '| payee.add.a | 甲 | ui:payee_list |',
            '| payee.add.b | 乙 | gap: 没有用例 |',
            '| payee.add.c | 丙 | device |',
          ]),
          story('pay.sheet', 'planned', ['| pay.sheet.copy | 复制 | ui |']),
        ),
      ),
    );
    expect(text).toContain('2 stories (done 1, building 0, planned 1)');
    expect(text).toContain(
      'Criteria: 4; covered by ui 1, unit 0, int 0, db 0, device 1, gap 1; planned only 1',
    );
    expect(text).toContain('GAP  payee.add.b: 乙 — 没有用例');
    expect(text).toContain('[done] payee.add.c: 丙');
    expect(text).toContain('Story map OK');
  });

  test('a fragment names a whole test or def, and may contain a comma', () => {
    const { errors } = check(
      map(
        story('payee.add', 'done', [
          '| payee.add.a | 甲 | unit:src/features/payee/validate.test.ts#caps at 60 characters, trimmed, device |',
          '| payee.add.b | 乙 | unit:verification/ui/helper.py#walk_home |',
          '| payee.add.c | 丙 | unit:src/features/payee/validate.test.ts#is req |',
        ]),
      ),
    );
    expect(errors).toEqual([expect.stringContaining('exactly "is req"')]);
    expect(quotedNames('it("x", f); describe(`y`, g);\ndef z():')).toEqual(
      new Set(['x', 'y', 'z']),
    );
  });

  test('warns about criterion rows outside a criteria table', () => {
    const text = map(story('payee.add', 'done', ['| payee.add.a | 甲 | ui:payee_list |'])).replace(
      '## 写法\n\n- 说明',
      '## 写法\n\n| payee.add.z | 迷路 | ui |',
    );
    const stray = `${text}\n- 说明\n\n| payee.add.y | 表外 | ui |\n`;
    expect(check(stray).warnings.filter((w) => w.includes('outside'))).toEqual([
      expect.stringContaining('payee.add.z is outside'),
      expect.stringContaining('payee.add.y is outside'),
    ]);
  });
});
