#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const API = 'https://api.appstoreconnect.apple.com';
const PENDING = new Set(['AWAITING_UPLOAD', 'PROCESSING']);

export function token({ keyPath, keyId, issuerId, now = Math.floor(Date.now() / 1000) }) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const input = `${encode({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${encode({
    iss: issuerId,
    iat: now,
    exp: now + 600,
    aud: 'appstoreconnect-v1',
  })}`;
  const key = createPrivateKey(readFileSync(keyPath));
  const signature = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' });
  return `${input}.${signature.toString('base64url')}`;
}

export function ascConfig(env = process.env) {
  const keyId = env.TAPIRO_ASC_KEY_ID ?? '5TGB2NXCG5';
  return {
    appId: env.TAPIRO_ASC_APP_ID ?? '6837172850',
    keyId,
    issuerId: env.TAPIRO_ASC_ISSUER_ID ?? 'aaabce4e-636b-4c19-bed9-d6840d0a2465',
    keyPath:
      env.TAPIRO_ASC_KEY_PATH ?? `${homedir()}/.appstoreconnect/private_keys/AuthKey_${keyId}.p8`,
  };
}

export function findUpload(uploads, version, build) {
  return uploads.find(
    ({ attributes }) =>
      attributes.cfBundleShortVersionString === version && attributes.cfBundleVersion === build,
  );
}

export function describeUpload(upload) {
  if (!upload) return { done: false, ok: false, lines: ['not listed yet'] };
  const { state, errors = [], warnings = [] } = upload.attributes.state;
  const lines = [
    `state ${state}`,
    ...errors.map((e) => `error ${e.code}: ${e.description}`),
    ...warnings.map((w) => `warning ${w.code}: ${w.description}`),
  ];
  return { done: !PENDING.has(state), ok: state === 'COMPLETE' && errors.length === 0, lines };
}

async function fetchUploads(config) {
  const response = await fetch(
    `${API}/v1/apps/${config.appId}/buildUploads?limit=50&fields[buildUploads]=cfBundleShortVersionString,cfBundleVersion,state`,
    { headers: { Authorization: `Bearer ${token(config)}` } },
  );
  if (!response.ok) throw new Error(`App Store Connect answered ${response.status}`);
  return (await response.json()).data ?? [];
}

async function main() {
  const [version, build, flag, seconds] = process.argv.slice(2);
  if (!version || !build) {
    console.error('usage: node scripts/asc-upload-status.mjs <version> <build> [--wait <seconds>]');
    process.exit(2);
  }
  const config = ascConfig();
  const deadline = Date.now() + (flag === '--wait' ? Number(seconds) * 1000 : 0);
  let last = '';
  for (;;) {
    const result = describeUpload(findUpload(await fetchUploads(config), version, build));
    const text = result.lines.join('\n');
    if (text !== last) console.log(`${version} (${build}): ${text}`);
    last = text;
    if (result.done) process.exit(result.ok ? 0 : 1);
    if (Date.now() >= deadline) {
      console.log(`${version} (${build}): still processing; rerun this script to check again`);
      process.exit(3);
    }
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
