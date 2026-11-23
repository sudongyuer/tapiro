import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(import.meta.dir, 'lint-changed.mjs');
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function repo(pyLines: number) {
  const root = mkdtempSync(join(tmpdir(), 'lint-changed-'));
  roots.push(root);
  mkdirSync(join(root, 'verification/ui'), { recursive: true });
  writeFileSync(join(root, 'verification/ui/case.py'), 'x = 1\n'.repeat(pyLines));
  const git = (...args: string[]) => Bun.spawnSync(['git', ...args], { cwd: root });
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');
  return root;
}

function lintChanged(root: string) {
  const proc = Bun.spawnSync(['node', SCRIPT, 'HEAD'], { cwd: root });
  return { code: proc.exitCode, output: proc.stdout.toString() + proc.stderr.toString() };
}

test('fails on a file over the size limit even when nothing needs linting', () => {
  const result = lintChanged(repo(501));
  expect(result.code).toBe(1);
  expect(result.output).toContain('verification/ui/case.py: 501 lines (limit 500)');
});

test('passes when nothing needs linting and every file is within its limit', () => {
  const result = lintChanged(repo(500));
  expect(result.code).toBe(0);
  expect(result.output).toContain('check-file-size: ok');
});

test('a checkout without node_modules is told to install before linting', () => {
  const root = repo(1);
  writeFileSync(join(root, 'changed.ts'), 'export const x = 1;\n');
  const result = lintChanged(root);
  expect(result.code).toBe(1);
  expect(result.output).toContain('bun install --frozen-lockfile');
});
