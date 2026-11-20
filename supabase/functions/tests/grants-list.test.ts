import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const functionsDir = join(import.meta.dir, '..');
const grantsTest = readFileSync(
  join(functionsDir, '..', 'tests', 'edge_function_grants.test.sql'),
  'utf8',
);

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'tests' ? [] : sources(path);
    const isTest = /\.(test|deno-test)\.ts$|TestKit\.ts$|fakes\.ts$|Fixtures?\.ts$/.test(
      entry.name,
    );
    return entry.name.endsWith('.ts') && !isTest ? [path] : [];
  });
}

function databaseNames() {
  const names = new Set<string>();
  for (const file of sources(functionsDir)) {
    const code = readFileSync(file, 'utf8');
    for (const [, name] of code.matchAll(/(?:\.rpc|\bcall)\(\s*'([a-z_]+)'/g)) names.add(name);
    for (const [, name] of code.matchAll(/(?<!storage)\.from\(\s*'([a-z_]+)'\s*\)/g))
      names.add(name);
  }
  return [...names].sort();
}

describe('edge_function_grants.test.sql', () => {
  test('finds the database names the functions use', () => {
    expect(databaseNames()).toEqual(
      expect.arrayContaining(['fx_rates', 'claim_due_pushes', 'iap_credit']),
    );
  });

  test('asserts a service-role grant for every table and RPC an Edge Function calls', () => {
    const missing = databaseNames().filter(
      (name) => !new RegExp(`'public\\.${name}\\b`).test(grantsTest),
    );
    expect(missing).toEqual([]);
  });
});
