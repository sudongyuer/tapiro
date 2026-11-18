import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(import.meta.dir, 'sim-lock.sh');
const SLOW = 20_000;

let dir = '';
const sleepers: Bun.Subprocess[] = [];

const env = (poll = '0.1') => ({
  ...process.env,
  TAPIRO_SIM_LOCK_DIR: dir,
  TAPIRO_SIM_LOCK_POLL: poll,
});

const lock = (...args: string[]) => {
  const r = Bun.spawnSync(['bash', SCRIPT, ...args], { env: env() });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
};

const background = (args: string[], poll = '0.1') =>
  Bun.spawn(['bash', SCRIPT, ...args], { env: env(poll), stdout: 'pipe', stderr: 'pipe' });

const sleeper = () => {
  const p = Bun.spawn(['sleep', '60']);
  sleepers.push(p);
  return p;
};

const queued = () => (existsSync(join(dir, 'queue')) ? readdirSync(join(dir, 'queue')).length : 0);

const waitFor = async (cond: () => boolean, ms = 5000) => {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error('condition not met in time');
    await Bun.sleep(25);
  }
};

const setup = () => {
  dir = mkdtempSync(join(tmpdir(), 'sim-lock-'));
};

afterEach(() => {
  for (const p of sleepers.splice(0)) p.kill(9);
  rmSync(dir, { recursive: true, force: true });
});

describe('sim-lock', () => {
  test(
    'serves three concurrent waiters in arrival order, one at a time, whatever their poll interval',
    async () => {
      setup();
      const holder = sleeper();
      expect(lock('acquire', 'holder', '--pid', String(holder.pid)).code).toBe(0);
      const log = join(dir, 'order.log');
      const polls = ['1', '0.3', '0.05'];
      const waiters: Bun.Subprocess[] = [];
      for (const [i, poll] of polls.entries()) {
        const name = `w${i + 1}`;
        waiters.push(
          background(
            [
              'run',
              name,
              '--',
              'bash',
              '-c',
              `echo start ${name} >> ${log}; sleep 0.3; echo end ${name} >> ${log}`,
            ],
            poll,
          ),
        );
        await waitFor(() => queued() === i + 1);
      }
      expect(lock('release', 'holder').code).toBe(0);
      const codes = await Promise.all(waiters.map((w) => w.exited));
      expect(codes).toEqual([0, 0, 0]);
      expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual([
        'start w1',
        'end w1',
        'start w2',
        'end w2',
        'start w3',
        'end w3',
      ]);
      expect(lock('status').out).toContain('free');
    },
    SLOW,
  );

  test('refuses a release by anyone but the holder', () => {
    setup();
    const holder = sleeper();
    expect(lock('acquire', 'a', '--pid', String(holder.pid)).code).toBe(0);
    const refused = lock('release', 'b');
    expect(refused.code).toBe(1);
    expect(refused.err).toContain('refused');
    expect(lock('status').out).toContain('held by a');
    expect(lock('release', 'a').code).toBe(0);
    expect(lock('status').out).toContain('free');
  });

  test(
    'takes over from a holder whose process is gone, and waits while it lives',
    async () => {
      setup();
      const holder = sleeper();
      const other = sleeper();
      expect(lock('acquire', 'a', '--pid', String(holder.pid)).code).toBe(0);
      expect(lock('acquire', 'b', '--pid', String(other.pid), '--timeout', '1').code).toBe(75);
      holder.kill(9);
      await holder.exited;
      const taken = lock('acquire', 'b', '--pid', String(other.pid), '--timeout', '5');
      expect(taken.code).toBe(0);
      expect(taken.err).toContain(`b took over: holder a pid ${holder.pid} is gone`);
      expect(lock('status').out).toContain('held by b');
      expect(readFileSync(join(dir, 'log'), 'utf8')).toContain('b took over');
    },
    SLOW,
  );

  test(
    'takes over from a live holder past the max age it declared, and not before',
    async () => {
      setup();
      const holder = sleeper();
      const other = sleeper();
      expect(lock('acquire', 'a', '--pid', String(holder.pid), '--max-age', '2').code).toBe(0);
      expect(lock('status').out).toContain('max age 2s');
      expect(lock('acquire', 'b', '--pid', String(other.pid), '--timeout', '1').code).toBe(75);
      await Bun.sleep(2100);
      const taken = lock('acquire', 'b', '--pid', String(other.pid), '--timeout', '5');
      expect(taken.code).toBe(0);
      expect(taken.err).toContain('over the max age of 2s');
      expect(lock('status').out).toContain('held by b');
    },
    SLOW,
  );

  test(
    'keeps a live holder that declared a long max age, whatever the waiter passes',
    async () => {
      setup();
      const holder = sleeper();
      const other = sleeper();
      expect(lock('acquire', 'a', '--pid', String(holder.pid), '--max-age', '100').code).toBe(0);
      await Bun.sleep(1100);
      const refused = lock(
        'acquire',
        'b',
        '--pid',
        String(other.pid),
        '--timeout',
        '2',
        '--max-age',
        '0',
      );
      expect(refused.code).toBe(75);
      expect(lock('status').out).toContain('held by a');
    },
    SLOW,
  );

  test(
    'drops a waiter whose process died from the queue',
    async () => {
      setup();
      const holder = sleeper();
      expect(lock('acquire', 'a', '--pid', String(holder.pid)).code).toBe(0);
      const ghost = background(['acquire', 'ghost', '--pid', String(holder.pid)]);
      await waitFor(() => queued() === 1);
      ghost.kill(9);
      await ghost.exited;
      expect(queued()).toBe(1);
      expect(lock('release', 'a').code).toBe(0);
      const next = lock('acquire', 'b', '--pid', String(holder.pid), '--timeout', '3');
      expect(next.code).toBe(0);
      expect(next.err).toContain('dropped ticket');
      expect(next.err).toContain('of ghost');
      expect(queued()).toBe(0);
    },
    SLOW,
  );

  test(
    'run releases the lock when the command fails and passes its exit status on',
    async () => {
      setup();
      const failed = lock('run', 'x', '--', 'bash', '-c', 'exit 7');
      expect(failed.code).toBe(7);
      expect(lock('status').out).toContain('free');
      expect(lock('run', 'y', '--timeout', '2', '--', 'true').code).toBe(0);
      expect(lock('status').out).toContain('free');
    },
    SLOW,
  );

  test(
    'run gives up at its timeout without running the command',
    async () => {
      setup();
      const holder = sleeper();
      expect(lock('acquire', 'a', '--pid', String(holder.pid)).code).toBe(0);
      const marker = join(dir, 'ran');
      const r = lock('run', 'b', '--timeout', '1', '--', 'touch', marker);
      expect(r.code).toBe(75);
      expect(existsSync(marker)).toBe(false);
      expect(queued()).toBe(0);
      expect(lock('status').out).toContain('held by a');
    },
    SLOW,
  );
});
