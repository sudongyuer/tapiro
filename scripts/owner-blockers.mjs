#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ascConfig } from './asc-upload-status.mjs';
import { ascProducts, storekitProducts } from './iap-preflight.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF = process.env.TAPIRO_SUPABASE_REF ?? 'wkpgoildusumtejzhtkv';

export const SECRETS = {
  APNs: ['APNS_PRIVATE_KEY', 'APNS_KEY_ID', 'APNS_TEAM_ID'],
  'Model Studio': ['MODEL_STUDIO_API_KEY', 'MODEL_STUDIO_WORKSPACE_ID'],
};
export const AI_TASKS = [
  'draft_bounty',
  'answer',
  'translate',
  'ask',
  'transcribe',
  'read_receipt',
];
export const MANUAL = [
  'Paid Apps agreement, banking and tax',
  'EU Digital Services Act trader status',
];

export function line(status, name, evidence) {
  return `${status.padEnd(7)} ${name}: ${evidence}`;
}

export function secretNames(json) {
  const rows = JSON.parse(json);
  if (!Array.isArray(rows)) throw new Error('unexpected answer from supabase secrets list');
  return rows.map((row) => row.name);
}

export function queryRows(json) {
  const rows = JSON.parse(json).rows;
  if (!Array.isArray(rows)) throw new Error('unexpected answer from supabase db query');
  return rows;
}

export function secretLines(names) {
  const present = new Set(names);
  return Object.entries(SECRETS).map(([group, wanted]) => {
    const missing = wanted.filter((name) => !present.has(name));
    return missing.length === 0
      ? line('OK', `${group} secrets`, `hosted has ${wanted.join(', ')}`)
      : line('BLOCKED', `${group} secrets`, `hosted lacks ${missing.join(', ')}`);
  });
}

export function pushLines([summary]) {
  const evidence = `${summary.sent} sent, ${summary.failed} failed, ${summary.tokens} device tokens`;
  if (!summary.last_sent)
    return [line('BLOCKED', 'APNs delivery', `no push_queue row sent yet; ${evidence}`)];
  return [
    line('OK', 'APNs delivery', `last push_queue row sent ${summary.last_sent}; ${evidence}`),
  ];
}

export function aiLines(rows) {
  if (rows.length === 0) {
    return [line('BLOCKED', 'Model Studio calls', 'no ai_metering row on a real model')];
  }
  const byModel = new Map();
  for (const row of rows) {
    const entry = byModel.get(row.model) ?? { last: '', tasks: [] };
    if (row.last_at > entry.last) entry.last = row.last_at;
    entry.tasks.push(`${row.task} ${row.calls}`);
    byModel.set(row.model, entry);
  }
  const out = [...byModel.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([model, { last, tasks }]) =>
      line('OK', `Model Studio ${model}`, `last ai_metering row ${last}; ${tasks.join(', ')}`),
    );
  const seen = new Set(rows.map((row) => row.task));
  const unseen = AI_TASKS.filter((task) => !seen.has(task));
  if (unseen.length > 0) {
    out.push(
      line(
        'NOT RUN',
        'Model Studio tasks',
        `${unseen.join(', ')} never metered on a real model (not an owner blocker)`,
      ),
    );
  }
  return out;
}

export function iapLines(expected, asc) {
  const byId = new Map(asc.map((product) => [product.productId, product]));
  const missing = expected.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return [line('BLOCKED', 'IAP products', `App Store Connect lacks ${missing.join(', ')}`)];
  }
  const states = expected.map((id) => `${id} ${byId.get(id).type} ${byId.get(id).state}`);
  return [line('OK', 'IAP products', states.join(', '))];
}

export function manualLines() {
  return MANUAL.map((name) =>
    line(
      'CHECK',
      name,
      'no App Store Connect API; check manually: appstoreconnect.apple.com/business',
    ),
  );
}

function supabase(args) {
  return execFileSync('supabase', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function query(sql) {
  return queryRows(supabase(['db', 'query', '--linked', '--project-ref', REF, '-o', 'json', sql]));
}

const PROBES = [
  [
    'hosted secrets',
    () =>
      secretLines(secretNames(supabase(['secrets', 'list', '--project-ref', REF, '-o', 'json']))),
  ],
  [
    'APNs delivery',
    () =>
      pushLines(
        query(
          'select (select max(sent_at) from public.push_queue) as last_sent, (select count(*) from public.push_queue where sent_at is not null) as sent, (select count(*) from public.push_queue where failed_at is not null) as failed, (select count(*) from public.push_tokens) as tokens',
        ),
      ),
  ],
  [
    'Model Studio calls',
    () =>
      aiLines(
        query(
          "select model, task, max(created_at)::text as last_at, count(*) as calls from public.ai_metering where not discarded and model <> 'fake' group by model, task order by model, task",
        ),
      ),
  ],
  [
    'IAP products',
    async () =>
      iapLines(
        storekitProducts(readFileSync(join(ROOT, 'ios-config/Tapiro.storekit'), 'utf8')).map(
          (product) => product.productId,
        ),
        await ascProducts(ascConfig()),
      ),
  ],
];

async function main() {
  let failed = false;
  for (const [name, probe] of PROBES) {
    try {
      for (const text of await probe()) {
        if (text.startsWith('BLOCKED')) failed = true;
        console.log(text);
      }
    } catch (error) {
      failed = true;
      console.log(line('UNKNOWN', name, `probe failed: ${error.message.split('\n')[0]}`));
    }
  }
  for (const text of manualLines()) console.log(text);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
