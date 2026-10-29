import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { check, countLines, isComponent } from './check-file-size.mjs';

const SCRIPT = join(import.meta.dir, 'check-file-size.mjs');
const roots: string[] = [];

function lines(count: number, first = 'export const x = 1;') {
  return [first, ...Array.from({ length: count - 1 }, (_, i) => `// ${i}`)].join('\n') + '\n';
}

function fixture(files: Record<string, string>, allowlist?: Record<string, number>) {
  const root = mkdtempSync(join(tmpdir(), 'check-file-size-'));
  roots.push(root);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  if (allowlist) {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'scripts/file-size-allowlist.json'), JSON.stringify(allowlist));
  }
  Bun.spawnSync(['git', 'init', '-q'], { cwd: root });
  Bun.spawnSync(['git', 'add', '-A'], { cwd: root });
  return root;
}

function run(root: string) {
  const proc = Bun.spawnSync(['node', SCRIPT, '--root', root]);
  return { code: proc.exitCode, output: proc.stdout.toString() + proc.stderr.toString() };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('check-file-size', () => {
  test('fails a 501-line file and names it with its count', () => {
    const result = run(fixture({ 'src/lib/big.ts': lines(501) }));
    expect(result.code).toBe(1);
    expect(result.output).toContain('src/lib/big.ts: 501 lines (limit 500)');
  });

  test('passes a 500-line file', () => {
    expect(run(fixture({ 'src/lib/big.ts': lines(500) })).code).toBe(0);
  });

  test('ignores files outside the scope and untracked files', () => {
    const root = fixture({ 'docs/big.ts': lines(900), 'src/lib/big.md': lines(900) });
    writeFileSync(join(root, 'src/lib/untracked.ts'), lines(900));
    expect(run(root).code).toBe(0);
  });

  test('holds a .tsx component under src/ to 300 lines', () => {
    const result = run(fixture({ 'src/ui/Card.tsx': lines(301, 'export function Card() {') }));
    expect(result.code).toBe(1);
    expect(result.output).toContain('src/ui/Card.tsx: 301 lines (limit 300)');
  });

  test('lets an allowlisted file stay at its count but not grow', () => {
    const files = { 'scripts/old.mjs': lines(600) };
    expect(run(fixture(files, { 'scripts/old.mjs': 600 })).code).toBe(0);
    const grown = run(fixture(files, { 'scripts/old.mjs': 599 }));
    expect(grown.code).toBe(1);
    expect(grown.output).toContain('grew past its allowlisted 599');
  });

  test('fails a stale allowlist entry so the list shrinks', () => {
    const result = run(fixture({ 'scripts/old.mjs': lines(400) }, { 'scripts/old.mjs': 600 }));
    expect(result.code).toBe(1);
    expect(result.output).toContain('remove it from');
  });
});

describe('helpers', () => {
  test('counts lines like wc -l, plus a last line without a newline', () => {
    expect(countLines('')).toBe(0);
    expect(countLines('a\nb\n')).toBe(2);
    expect(countLines('a\nb')).toBe(2);
  });

  test('tells components from other .tsx files', () => {
    expect(isComponent('src/ui/Card.tsx', 'export function Card() {}')).toBe(true);
    expect(isComponent('src/app/x.tsx', 'export default function Screen() {}')).toBe(true);
    expect(isComponent('src/debug/scenes.tsx', 'export const scenes = [];')).toBe(false);
    expect(isComponent('src/ui/Card.ts', 'export function Card() {}')).toBe(false);
  });

  test('reports a shrunk allowlisted file as a note, not a failure', () => {
    const result = check([{ path: 'scripts/old.mjs', text: lines(550) }], {
      'scripts/old.mjs': 600,
    });
    expect(result.problems).toEqual([]);
    expect(result.notes[0]).toContain('lower its allowlist entry from 600');
  });
});
