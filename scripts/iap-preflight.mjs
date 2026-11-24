#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { token } from './asc-upload-status.mjs';

const API = 'https://api.appstoreconnect.apple.com';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function storekitProducts(text) {
  const config = JSON.parse(text);
  return [...(config.products ?? []), ...(config.nonRenewingSubscriptions ?? [])].map(
    (product) => ({
      productId: product.productID,
      type: product.type,
    }),
  );
}

export function compareProducts({ server, storekit, asc }) {
  const problems = [];
  const serverIds = new Set(server);
  const storekitIds = new Set(storekit.map((product) => product.productId));
  const ascById = new Map(asc.map((product) => [product.productId, product]));
  for (const id of serverIds) {
    if (!storekitIds.has(id)) problems.push(`${id} is in iap_products but not in Tapiro.storekit`);
  }
  for (const id of storekitIds) {
    if (!serverIds.has(id)) problems.push(`${id} is in Tapiro.storekit but not in iap_products`);
  }
  for (const id of [...new Set([...serverIds, ...storekitIds])].sort()) {
    const found = ascById.get(id);
    if (!found) {
      problems.push(`${id} is missing from App Store Connect, so StoreKit cannot load its price`);
    } else if (found.type !== 'CONSUMABLE') {
      problems.push(`${id} is ${found.type} in App Store Connect, not CONSUMABLE`);
    }
  }
  return problems;
}

export async function ascProducts(config) {
  const out = [];
  let next = `${API}/v1/apps/${config.appId}/inAppPurchasesV2?limit=200&fields[inAppPurchases]=productId,inAppPurchaseType,state`;
  while (next) {
    const response = await fetch(next, { headers: { Authorization: `Bearer ${token(config)}` } });
    if (!response.ok) throw new Error(`App Store Connect answered ${response.status}`);
    const page = await response.json();
    for (const { attributes } of page.data ?? []) {
      out.push({
        productId: attributes.productId,
        type: attributes.inAppPurchaseType,
        state: attributes.state,
      });
    }
    next = page.links?.next;
  }
  return out;
}

function serverProducts(ref) {
  const text = execFileSync(
    'supabase',
    [
      'db',
      'query',
      '--linked',
      '--project-ref',
      ref,
      '-o',
      'json',
      'select product_id from public.iap_products',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const rows = JSON.parse(text).rows;
  if (!Array.isArray(rows)) throw new Error('unexpected answer from supabase db query');
  return rows.map((row) => row.product_id);
}

async function main() {
  const keyId = process.env.TAPIRO_ASC_KEY_ID ?? '5TGB2NXCG5';
  const config = {
    appId: process.env.TAPIRO_ASC_APP_ID ?? '6837172850',
    keyId,
    issuerId: process.env.TAPIRO_ASC_ISSUER_ID ?? 'aaabce4e-636b-4c19-bed9-d6840d0a2465',
    keyPath:
      process.env.TAPIRO_ASC_KEY_PATH ??
      `${homedir()}/.appstoreconnect/private_keys/AuthKey_${keyId}.p8`,
  };
  const storekit = storekitProducts(readFileSync(join(ROOT, 'ios-config/Tapiro.storekit'), 'utf8'));
  const server = serverProducts(process.env.TAPIRO_SUPABASE_REF ?? 'wkpgoildusumtejzhtkv');
  const asc = await ascProducts(config);
  for (const product of asc) console.log(`${product.productId}: ${product.type}, ${product.state}`);
  const problems = compareProducts({ server, storekit, asc });
  for (const problem of problems) console.error(`iap-preflight: ${problem}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`iap-preflight: ${error.message}`);
    process.exit(1);
  });
}
