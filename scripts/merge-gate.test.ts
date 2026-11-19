import { afterEach, describe, expect, test } from 'bun:test';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { decide } from './merge-gate.mjs';

const SCRIPT = join(import.meta.dir, 'merge-when-green.sh');
const HEAD = '0123456789abcdef0123456789abcdef01234567';
const OLD = 'fedcba9876543210fedcba9876543210fedcba98';

const run = (name: string, status: string, conclusion: string) => ({
  __typename: 'CheckRun',
  name,
  status,
  conclusion,
});
const passed = run('check', 'COMPLETED', 'SUCCESS');
const context = (state: string) => ({ __typename: 'StatusContext', context: 'ext', state });

describe('decide', () => {
  test('refuses when no check has registered', () => {
    expect(decide({ statusCheckRollup: [] }).verdict).toBe('none');
    expect(decide({}).verdict).toBe('none');
    expect(decide(null).verdict).toBe('none');
  });

  test('refuses while a check is queued or running', () => {
    for (const status of ['QUEUED', 'IN_PROGRESS', 'WAITING', 'PENDING', 'REQUESTED']) {
      expect(decide({ statusCheckRollup: [passed, run('supabase', status, '')] }).verdict).toBe(
        'pending',
      );
    }
    expect(decide({ statusCheckRollup: [passed, context('PENDING')] }).verdict).toBe('pending');
  });

  test('refuses when any check concluded other than success, skipped or neutral', () => {
    for (const conclusion of [
      'FAILURE',
      'CANCELLED',
      'TIMED_OUT',
      'ACTION_REQUIRED',
      'STALE',
      'STARTUP_FAILURE',
      '',
    ]) {
      const view = { statusCheckRollup: [passed, run('supabase', 'COMPLETED', conclusion)] };
      expect(decide(view).verdict).toBe('fail');
    }
    expect(decide({ statusCheckRollup: [passed, context('ERROR')] }).verdict).toBe('fail');
  });

  test('a failure outranks a pending check', () => {
    const view = {
      statusCheckRollup: [run('a', 'IN_PROGRESS', ''), run('b', 'COMPLETED', 'FAILURE')],
    };
    expect(decide(view)).toEqual({ verdict: 'fail', details: ['b: FAILURE'] });
  });

  test('refuses checks that belong to a head other than the pushed one', () => {
    expect(decide({ headRefOid: OLD, statusCheckRollup: [passed] }, HEAD).verdict).toBe('stale');
    expect(decide({ statusCheckRollup: [passed] }, HEAD).verdict).toBe('stale');
    expect(decide({ headRefOid: HEAD, statusCheckRollup: [passed] }, HEAD).verdict).toBe('pass');
  });

  test('passes only when every check succeeded, skipped or was neutral', () => {
    const view = {
      statusCheckRollup: [
        passed,
        run('skip', 'COMPLETED', 'SKIPPED'),
        run('info', 'COMPLETED', 'NEUTRAL'),
        context('SUCCESS'),
      ],
    };
    expect(decide(view).verdict).toBe('pass');
  });
});

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

type View = { head: string; rollup: unknown[] };

function fakeGh(rollups: (unknown[] | View)[], checksExit: number) {
  const dir = mkdtempSync(join(tmpdir(), 'merge-when-green-'));
  dirs.push(dir);
  rollups.forEach((view, i) => {
    const { head, rollup } = Array.isArray(view) ? { head: HEAD, rollup: view } : view;
    writeFileSync(
      join(dir, `view${i}.json`),
      JSON.stringify({ headRefOid: head, statusCheckRollup: rollup }),
    );
  });
  writeFileSync(join(dir, 'count'), '0');
  const gh = `#!/usr/bin/env bash
dir=${JSON.stringify(dir)}
echo "$*" >> "$dir/calls"
case "$1 $2" in
  "api repos/sudongyuer/tapiro/git/ref/heads/fix/x") echo ${HEAD} ;;
  "pr view")
    if [[ "$*" == *headRefName* ]]; then
      echo '{"headRefName":"fix/x","headRepository":{"nameWithOwner":"sudongyuer/tapiro"}}'; exit 0
    fi
    n=$(cat "$dir/count"); last=${rollups.length - 1}
    (( n > last )) && n=$last
    cat "$dir/view$n.json"; echo $(( $(cat "$dir/count") + 1 )) > "$dir/count" ;;
  "pr checks") exit ${checksExit} ;;
  "pr merge") touch "$dir/merged" ;;
esac
`;
  writeFileSync(join(dir, 'gh'), gh);
  chmodSync(join(dir, 'gh'), 0o755);
  return dir;
}

function mergeWhenGreen(dir: string, waitSeconds = '0') {
  const result = Bun.spawnSync(['bash', SCRIPT, '42'], {
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      MERGE_WAIT_FOR_CHECKS_SECONDS: waitSeconds,
      MERGE_POLL_SECONDS: '0',
    },
  });
  const calls = existsSync(join(dir, 'calls')) ? readFileSync(join(dir, 'calls'), 'utf8') : '';
  return { code: result.exitCode, merged: existsSync(join(dir, 'merged')), calls };
}

describe('merge-when-green.sh', () => {
  test('does not merge when no check ever registers', () => {
    const r = mergeWhenGreen(fakeGh([[]], 0));
    expect(r.code).not.toBe(0);
    expect(r.merged).toBe(false);
    expect(r.calls).not.toContain('pr checks');
  });

  test('waits past the previous head and merges the pushed head once its checks are green', () => {
    const stale = { head: OLD, rollup: [passed] };
    const r = mergeWhenGreen(fakeGh([stale, stale, [], [passed]], 0), '30');
    expect(r.code).toBe(0);
    expect(r.calls).toContain(`pr merge 42 --squash --match-head-commit ${HEAD}`);
  });

  test('does not watch or merge while only the previous head has checks', () => {
    const r = mergeWhenGreen(fakeGh([{ head: OLD, rollup: [passed] }], 0));
    expect(r.code).not.toBe(0);
    expect(r.merged).toBe(false);
    expect(r.calls).not.toContain('pr checks');
  });

  test('does not merge when the head moves again during the watch', () => {
    const r = mergeWhenGreen(fakeGh([[passed], { head: OLD, rollup: [passed] }], 0));
    expect(r.code).not.toBe(0);
    expect(r.merged).toBe(false);
  });

  test('does not merge when the head of the branch cannot be read', () => {
    const dir = fakeGh([[passed]], 0);
    writeFileSync(
      join(dir, 'gh'),
      readFileSync(join(dir, 'gh'), 'utf8').replace(`echo ${HEAD}`, 'exit 1'),
    );
    const r = mergeWhenGreen(dir);
    expect(r.code).not.toBe(0);
    expect(r.merged).toBe(false);
  });

  test('does not merge when the watch reports a failing check', () => {
    const r = mergeWhenGreen(fakeGh([[run('check', 'COMPLETED', 'FAILURE')]], 1));
    expect(r.code).not.toBe(0);
    expect(r.merged).toBe(false);
  });

  test('does not merge when the watch returns early but the rollup is still pending', () => {
    const r = mergeWhenGreen(fakeGh([[passed], [passed, run('supabase', 'QUEUED', '')]], 0));
    expect(r.code).not.toBe(0);
    expect(r.merged).toBe(false);
  });

  test('does not merge when the rollup shows a failure the watch missed', () => {
    const r = mergeWhenGreen(fakeGh([[passed], [run('check', 'COMPLETED', 'CANCELLED')]], 0));
    expect(r.code).not.toBe(0);
    expect(r.merged).toBe(false);
  });

  test('merges the verified head commit once every check is green', () => {
    const r = mergeWhenGreen(fakeGh([[passed, run('skip', 'COMPLETED', 'SKIPPED')]], 0));
    expect(r.code).toBe(0);
    expect(r.merged).toBe(true);
    expect(r.calls).toContain(`pr merge 42 --squash --match-head-commit ${HEAD}`);
  });

  test('rejects a missing or non-numeric PR argument without calling gh', () => {
    const dir = fakeGh([[passed]], 0);
    const result = Bun.spawnSync(['bash', SCRIPT, 'abc'], {
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });
    expect(result.exitCode).toBe(2);
    expect(existsSync(join(dir, 'calls'))).toBe(false);
  });
});
