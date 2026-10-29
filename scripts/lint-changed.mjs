import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const base = process.argv[2] ?? 'origin/main';
const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);

const files = [
  ...new Set([
    ...git('diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`),
    ...git('diff', '--name-only', '--diff-filter=ACMR', 'HEAD'),
    ...git('ls-files', '--others', '--exclude-standard'),
  ]),
].filter((file) => /\.(ts|tsx|js|mjs)$/.test(file) && existsSync(file));

if (files.length === 0) {
  console.log(`no changed lintable files since ${base}`);
  process.exit(0);
}

console.log(`linting ${files.length} changed files since ${base}`);
const env = { ...process.env, PATH: `/opt/homebrew/bin:${process.env.PATH}` };
const result = spawnSync('bun', ['run', 'lint', '--', ...files], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
