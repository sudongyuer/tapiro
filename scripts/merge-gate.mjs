import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PASSING = new Set(['SUCCESS', 'SKIPPED', 'NEUTRAL']);

function outcome(check) {
  if (check.__typename === 'StatusContext') {
    const state = check.state ?? '';
    if (state === 'PENDING' || state === 'EXPECTED' || state === '') return 'pending';
    return state === 'SUCCESS' ? 'pass' : 'fail';
  }
  if (check.status !== 'COMPLETED') return 'pending';
  return PASSING.has(check.conclusion) ? 'pass' : 'fail';
}

function label(check) {
  const name = check.name ?? check.context ?? '(unnamed)';
  const result =
    check.__typename === 'StatusContext' ? check.state : check.conclusion || check.status;
  return `${name}: ${result ?? 'unknown'}`;
}

export function decide(view) {
  const checks = Array.isArray(view?.statusCheckRollup) ? view.statusCheckRollup : [];
  if (checks.length === 0) return { verdict: 'none', details: ['no checks reported'] };
  const failing = checks.filter((c) => outcome(c) === 'fail');
  if (failing.length > 0) return { verdict: 'fail', details: failing.map(label) };
  const pending = checks.filter((c) => outcome(c) === 'pending');
  if (pending.length > 0) return { verdict: 'pending', details: pending.map(label) };
  return { verdict: 'pass', details: checks.map(label) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let view;
  try {
    view = JSON.parse(readFileSync(0, 'utf8'));
  } catch (error) {
    console.error(`merge-gate: cannot parse gh pr view JSON: ${error.message}`);
    process.exit(2);
  }
  const { verdict, details } = decide(view);
  console.log(verdict);
  for (const line of details) console.error(`  ${line}`);
  process.exit(verdict === 'pass' ? 0 : 1);
}
