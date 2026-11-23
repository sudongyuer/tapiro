#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { API, ascConfig, token } from './asc-upload-status.mjs';

export const PUBLIC_GROUP = 'ac03bf4b-819f-4004-ae13-b49f81d1c0e0';
export const LOCALES = ['zh-Hans', 'en-US'];
export const DEFAULT_NOTES = fileURLToPath(
  new URL('./testflight-what-to-test.txt', import.meta.url),
);

export function parseWhatToTest(text) {
  const sections = {};
  let current;
  for (const line of text.split('\n')) {
    const header = line.trim().match(/^\[([A-Za-z-]+)\]$/);
    if (header) {
      current = header[1];
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  const whole = text.trim();
  const notes = Object.fromEntries(
    LOCALES.map((locale) => [locale, current ? (sections[locale] ?? []).join('\n').trim() : whole]),
  );
  const missing = LOCALES.filter((locale) => !notes[locale]);
  if (missing.length) throw new Error(`What to Test has no text for ${missing.join(', ')}`);
  return notes;
}

export function buildsPath(appId, version, build) {
  const query = new URLSearchParams({
    'filter[app]': appId,
    'filter[version]': build,
    'filter[preReleaseVersion.version]': version,
    'fields[builds]': 'version,processingState,usesNonExemptEncryption',
    limit: '2',
  });
  return `/v1/builds?${query}`;
}

export function pickBuild(response, build) {
  const found = (response.data ?? []).find(({ attributes }) => attributes?.version === build);
  if (!found) return undefined;
  return { id: found.id, processingState: found.attributes.processingState };
}

export function localizationRequests(buildId, existing, notes) {
  return LOCALES.map((locale) => {
    const current = (existing.data ?? []).find(({ attributes }) => attributes?.locale === locale);
    if (current) {
      if (current.attributes.whatsNew === notes[locale]) return undefined;
      return {
        locale,
        method: 'PATCH',
        path: `/v1/betaBuildLocalizations/${current.id}`,
        body: {
          data: {
            type: 'betaBuildLocalizations',
            id: current.id,
            attributes: { whatsNew: notes[locale] },
          },
        },
      };
    }
    return {
      locale,
      method: 'POST',
      path: '/v1/betaBuildLocalizations',
      body: {
        data: {
          type: 'betaBuildLocalizations',
          attributes: { locale, whatsNew: notes[locale] },
          relationships: { build: { data: { type: 'builds', id: buildId } } },
        },
      },
    };
  }).filter(Boolean);
}

export function groupMembershipPath(groupId, buildId) {
  const query = new URLSearchParams({
    'filter[betaGroups]': groupId,
    'filter[id]': buildId,
    'fields[builds]': 'version',
  });
  return `/v1/builds?${query}`;
}

export function inGroup(response, buildId) {
  return (response.data ?? []).some(({ id }) => id === buildId);
}

export function addToGroupRequest(groupId, buildId) {
  return {
    method: 'POST',
    path: `/v1/betaGroups/${groupId}/relationships/builds`,
    body: { data: [{ type: 'builds', id: buildId }] },
  };
}

export function submissionRequest(buildId) {
  return {
    method: 'POST',
    path: '/v1/betaAppReviewSubmissions',
    body: {
      data: {
        type: 'betaAppReviewSubmissions',
        relationships: { build: { data: { type: 'builds', id: buildId } } },
      },
    },
  };
}

export function reviewState(response) {
  return response.data?.attributes?.betaReviewState;
}

export function describeErrors(status, body) {
  const details = (body?.errors ?? []).map((e) => `${e.code}: ${e.detail ?? e.title}`);
  return [`App Store Connect answered ${status}`, ...details].join('\n');
}

async function call(config, { method = 'GET', path, body }) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token(config)}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok)
    throw new Error(`${method} ${path}\n${describeErrors(response.status, parsed)}`);
  return parsed;
}

async function waitForValidBuild(config, version, build, seconds) {
  const deadline = Date.now() + seconds * 1000;
  for (;;) {
    const found = pickBuild(
      await call(config, { path: buildsPath(config.appId, version, build) }),
      build,
    );
    if (found?.processingState === 'VALID') return found;
    if (found && found.processingState !== 'PROCESSING') {
      throw new Error(`build ${build} is ${found.processingState}, not VALID`);
    }
    if (Date.now() >= deadline)
      throw new Error(
        `build ${build} is not VALID yet (${found?.processingState ?? 'not listed'})`,
      );
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
}

async function main() {
  const [version, build, ...rest] = process.argv.slice(2);
  if (version === '--check-notes') {
    parseWhatToTest(readFileSync(build ?? DEFAULT_NOTES, 'utf8'));
    return;
  }
  const option = (name) => {
    const index = rest.indexOf(name);
    return index === -1 ? undefined : rest[index + 1];
  };
  if (!version || !build) {
    console.error(
      'usage: node scripts/asc-testflight.mjs <version> <build> [--notes <file>] [--group <id>] [--wait <seconds>] [--dry-run]',
    );
    process.exit(2);
  }
  const config = ascConfig();
  const notesFile = option('--notes') ?? DEFAULT_NOTES;
  const groupId = option('--group') ?? process.env.TAPIRO_ASC_EXTERNAL_GROUP ?? PUBLIC_GROUP;
  const notes = parseWhatToTest(readFileSync(notesFile, 'utf8'));

  const dryRun = rest.includes('--dry-run');
  const write = async (request, done) => {
    if (dryRun)
      return console.log(
        `dry run: ${request.method} ${request.path} ${JSON.stringify(request.body)}`,
      );
    await call(config, request);
    console.log(done);
  };

  const found = await waitForValidBuild(config, version, build, Number(option('--wait') ?? 600));
  console.log(`${version} (${build}): build ${found.id}`);

  const existing = await call(config, { path: `/v1/builds/${found.id}/betaBuildLocalizations` });
  const updates = localizationRequests(found.id, existing, notes);
  if (!updates.length) console.log('What to Test: already up to date');
  for (const request of updates) {
    await write(
      request,
      `What to Test (${request.locale}): ${request.method === 'POST' ? 'added' : 'updated'}`,
    );
  }

  const member = await call(config, { path: groupMembershipPath(groupId, found.id) });
  if (inGroup(member, found.id)) console.log(`already in beta group ${groupId}`);
  else await write(addToGroupRequest(groupId, found.id), `added to beta group ${groupId}`);

  const state = reviewState(
    await call(config, { path: `/v1/builds/${found.id}/betaAppReviewSubmission` }),
  );
  if (state) {
    console.log(`beta app review already submitted: ${state}`);
    return;
  }
  await write(submissionRequest(found.id), 'submitted for beta app review');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
