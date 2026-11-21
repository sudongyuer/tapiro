import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

const HOOK = join(import.meta.dir, 'block-force-push.ts');

const run = (command: string, toolInput: object = { command }) => {
  const r = Bun.spawnSync(['bun', HOOK], {
    stdin: Buffer.from(JSON.stringify({ tool_name: 'Bash', tool_input: toolInput })),
  });
  return { code: r.exitCode, err: r.stderr.toString() };
};

const BLOCKED = [
  'git push --force',
  'git push --force origin feat/x',
  'git push --force-with-lease',
  'git push --force-with-lease=main:abc123 origin main',
  'git push --force-if-includes --force-with-lease origin x',
  'git push --forc origin x',
  'git push --mirror origin',
  'git push -f origin x',
  'timeout 30 git push -f origin x',
  'sudo -u me git push --force',
  'git push -uf origin x',
  'git push -fu origin x',
  'git -C /tmp/repo push --force',
  'git -C "/path with space" -c core.pager=cat push --force-with-lease',
  'git --git-dir=.git --no-pager push -f',
  'git -c remote.origin.push=+refs/heads/*:refs/heads/* push',
  'git push origin +x',
  'git push origin +HEAD:refs/heads/x',
  'git push origin main +feat/x',
  'git push -- origin +x',
  'git push "--force" origin x',
  "git push '-f' origin x",
  'git push origin "+x"',
  'git pu\\sh -f',
  "git p''ush -f",
  'bun test && git push -f origin x',
  'git add -A && git commit -m "wip" && git push --force-with-lease',
  'cd /tmp/repo; git push -f',
  'false || git push --force',
  'true | git push -f',
  '(cd repo && git push -f)',
  'echo $(git push -f)',
  'FOO=1 git push -f',
  'env GIT_TRACE=1 git push -f',
  'command git push -f',
  '/usr/bin/git push -f',
  'bash -c "git push -f origin x"',
  "sh -lc 'git status && git push --force'",
  'eval "git push -f"',
  'git push origin x \\\n  --force-with-lease',
  'git status\ngit push -f origin x',
  'git push origin x 2>&1 --force',
  'env -u HOME git push -f',
  'echo x | xargs -I{} git push -f origin {}',
  "cat <<'EOF' > notes.txt\nhello\nEOF\ngit push -f",
];

const ALLOWED = [
  'git push',
  'git push -u origin x',
  'git push --set-upstream origin feat/x',
  'git push origin HEAD:refs/heads/x',
  'git push --follow-tags origin x',
  'git push --no-force-with-lease origin x',
  'git push --delete origin x',
  'git push origin :x',
  'git push -o ci.skip origin x',
  'git push -ofoo origin x',
  'git push --push-option -f origin x',
  'git commit -m "never git push -f here"',
  'echo "git push --force"',
  "git log --format='%H +x' && git push origin x",
  'git push origin x > push+f.log',
  'git fetch -f origin',
  'git pull --force',
  'git push origin x # --force later',
  'gh pr create --title "git push -f"',
  'ls -f',
  "git commit -F - <<'EOF'\nfix: never git push -f\n+x\nEOF",
  'cat <<-EOF\n\tgit push --force\n\tEOF\ngit push origin x',
  'git commit -m "$(cat <<\'EOF\'\ngit push -f\nEOF\n)"',
  '',
];

describe('block-force-push hook', () => {
  for (const command of BLOCKED) {
    test(`blocks ${JSON.stringify(command)}`, () => {
      const r = run(command);
      expect(r.code).toBe(2);
      expect(r.err).toContain('ask');
    });
  }

  for (const command of ALLOWED) {
    test(`allows ${JSON.stringify(command)}`, () => {
      expect(run(command).code).toBe(0);
    });
  }

  test('allows input without a command', () => {
    expect(run('', {}).code).toBe(0);
  });
});
