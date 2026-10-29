#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCOPES = [
  'src/',
  'modules/tapiro-kit/',
  'supabase/migrations/',
  'supabase/functions/',
  'scripts/',
  'verification/ui/',
];
export const EXTENSIONS = ['.ts', '.tsx', '.swift', '.sql', '.py', '.mjs'];
export const FILE_LIMIT = 500;
export const COMPONENT_LIMIT = 300;
export const ALLOWLIST = 'scripts/file-size-allowlist.json';

const COMPONENT_EXPORT =
  /^export\s+(?:default\s+(?!type\b|interface\b)|(?:async\s+)?(?:function|const|class)\s+[A-Z])/m;

export function inScope(path) {
  return (
    SCOPES.some((scope) => path.startsWith(scope)) && EXTENSIONS.some((ext) => path.endsWith(ext))
  );
}

export function countLines(text) {
  if (text === '') return 0;
  const breaks = text.split('\n').length - 1;
  return text.endsWith('\n') ? breaks : breaks + 1;
}

export function isComponent(path, text) {
  return path.startsWith('src/') && path.endsWith('.tsx') && COMPONENT_EXPORT.test(text);
}

export function limitFor(path, text) {
  return isComponent(path, text) ? COMPONENT_LIMIT : FILE_LIMIT;
}

export function check(files, allowlist) {
  const problems = [];
  const notes = [];
  const seen = new Set();
  for (const { path, text } of files) {
    const lines = countLines(text);
    const limit = limitFor(path, text);
    const allowed = allowlist[path];
    if (allowed !== undefined) seen.add(path);
    if (lines <= limit) {
      if (allowed !== undefined)
        problems.push(`${path}: ${lines} lines, within ${limit}; remove it from ${ALLOWLIST}`);
      continue;
    }
    if (allowed === undefined) problems.push(`${path}: ${lines} lines (limit ${limit})`);
    else if (lines > allowed)
      problems.push(
        `${path}: ${lines} lines (limit ${limit}), grew past its allowlisted ${allowed}`,
      );
    else if (lines < allowed)
      notes.push(`${path}: ${lines} lines; lower its allowlist entry from ${allowed}`);
  }
  for (const path of Object.keys(allowlist)) {
    if (!seen.has(path))
      problems.push(`${path}: no longer a checked file; remove it from ${ALLOWLIST}`);
  }
  return { problems, notes };
}

export function trackedFiles(root) {
  const out = execFileSync('git', ['-C', root, 'ls-files', '-z', '--', ...SCOPES], {
    encoding: 'utf8',
  });
  return out
    .split('\0')
    .filter((path) => path && inScope(path) && existsSync(join(root, path)))
    .map((path) => ({ path, text: readFileSync(join(root, path), 'utf8') }));
}

function main(argv) {
  const rootIndex = argv.indexOf('--root');
  const root = resolve(rootIndex >= 0 ? argv[rootIndex + 1] : process.cwd());
  const listPath = join(root, ALLOWLIST);
  const allowlist = existsSync(listPath) ? JSON.parse(readFileSync(listPath, 'utf8')) : {};
  const { problems, notes } = check(trackedFiles(root), allowlist);
  for (const note of notes) console.log(`note: ${note}`);
  if (problems.length) {
    console.error(
      `Files over the size limit (${FILE_LIMIT} lines; ${COMPONENT_LIMIT} for .tsx components under src/):`,
    );
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log('check-file-size: ok');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2));
