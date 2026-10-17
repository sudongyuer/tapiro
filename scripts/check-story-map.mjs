#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const STATUSES = ['done', 'building', 'planned'];
export const KINDS = ['ui', 'unit', 'int', 'db'];
const STORY_ID = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/;
const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
const RELEASE = /^(v\d+|later)$/;
const FIELDS = { 故事: 'story', 状态: 'status', 版本: 'release', 规格: 'spec' };
const NONE = new Set(['', '—', '-']);

function cells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function parseCoverage(text) {
  if (NONE.has(text.trim())) return [];
  return text.split(',').map((raw) => {
    const token = raw.trim();
    const target = /^(ui|unit|int|db):(.+)$/.exec(token);
    if (target) {
      const [path, fragment] = target[2].trim().split('#');
      return {
        kind: target[1],
        target: path.trim(),
        fragment: fragment?.trim() || null,
        raw: token,
      };
    }
    if (KINDS.includes(token)) return { kind: token, target: null, planned: true, raw: token };
    const device = /^device(?:\s*:\s*(.*))?$/.exec(token);
    if (device) return { kind: 'device', note: device[1]?.trim() || null, raw: token };
    const gap = /^gap(?:\s*:\s*(.*))?$/.exec(token);
    if (gap) return { kind: 'gap', reason: gap[1]?.trim() || null, raw: token };
    return { kind: 'unknown', raw: token };
  });
}

export function parseStoryMap(text) {
  const activities = [];
  let activity = null;
  let story = null;
  let inTable = false;
  text.split(/\r?\n/).forEach((line, index) => {
    const lineNo = index + 1;
    if (/^## /.test(line)) {
      activity = { name: line.slice(3).trim(), stories: [], line: lineNo };
      activities.push(activity);
      story = null;
      inTable = false;
      return;
    }
    if (/^### /.test(line)) {
      const [id, ...title] = line.slice(4).trim().split(/\s+/);
      story = { id, title: title.join(' '), criteria: [], line: lineNo, activity: activity?.name };
      activity?.stories.push(story);
      inTable = false;
      return;
    }
    if (!story) return;
    const field = /^- (故事|状态|版本|规格)[：:]\s*(.*)$/.exec(line);
    if (field) {
      story[FIELDS[field[1]]] = field[2].trim();
      return;
    }
    if (!line.trim().startsWith('|')) {
      inTable = false;
      return;
    }
    const row = cells(line);
    if (row[0] === '验收 id') {
      inTable = true;
      return;
    }
    if (!inTable || row.every((cell) => /^:?-+:?$/.test(cell))) return;
    story.criteria.push({
      id: row[0],
      behaviour: row[1] ?? '',
      coverage: parseCoverage(row[2] ?? ''),
      cells: row.length,
      line: lineNo,
    });
  });
  return activities.filter((a) => a.stories.length > 0);
}

function specPath(spec) {
  return /\]\(([^)#]+)(?:#[^)]*)?\)/.exec(spec ?? '')?.[1] ?? null;
}

export function checkStoryMap(text, { exists, read, mapDir = 'docs', uiCases }) {
  const errors = [];
  const warnings = [];
  const activities = parseStoryMap(text);
  const stories = activities.flatMap((a) => a.stories);
  const storyIds = new Set();
  const criterionIds = new Set();
  const referencedCases = new Set();
  const device = [];
  const gaps = [];
  const at = (item) => `line ${item.line}`;

  for (const story of stories) {
    if (!STORY_ID.test(story.id)) errors.push(`${at(story)}: malformed story id "${story.id}"`);
    if (storyIds.has(story.id)) errors.push(`${at(story)}: duplicate story id "${story.id}"`);
    storyIds.add(story.id);
    if (!story.story) errors.push(`${at(story)}: ${story.id} has no "- 故事：" line`);
    if (!STATUSES.includes(story.status)) {
      errors.push(
        `${at(story)}: ${story.id} status "${story.status ?? ''}" is not ${STATUSES.join(' | ')}`,
      );
    }
    if (!RELEASE.test(story.release ?? '')) {
      errors.push(
        `${at(story)}: ${story.id} release "${story.release ?? ''}" is not v<n> or later`,
      );
    }
    const spec = specPath(story.spec);
    if (!spec) errors.push(`${at(story)}: ${story.id} has no "- 规格：[name](path)" link`);
    else if (!exists(posix.join(mapDir, spec)))
      errors.push(`${at(story)}: ${story.id} spec ${spec} does not exist`);
    if (story.criteria.length === 0 && story.status === 'planned') {
      warnings.push(`${at(story)}: planned story ${story.id} has no acceptance criteria`);
    }
    if (story.criteria.length === 0 && story.status !== 'planned') {
      errors.push(`${at(story)}: ${story.status} story ${story.id} has no acceptance criteria`);
    }

    for (const criterion of story.criteria) {
      const where = `${at(criterion)}: ${criterion.id}`;
      if (criterion.cells !== 3)
        errors.push(`${where} row has ${criterion.cells} cells, expected 3`);
      const prefix = `${story.id}.`;
      const tail = criterion.id.startsWith(prefix) ? criterion.id.slice(prefix.length) : null;
      if (tail === null || !SEGMENT.test(tail) || !STORY_ID.test(criterion.id)) {
        errors.push(`${where} is malformed: expected ${prefix}<segment>`);
      }
      if (criterionIds.has(criterion.id)) errors.push(`${where} is a duplicate criterion id`);
      criterionIds.add(criterion.id);
      if (!criterion.behaviour) errors.push(`${where} has no behaviour`);

      const done = story.status === 'done';
      if (done && criterion.coverage.length === 0) errors.push(`${where} (done) has no coverage`);
      for (const c of criterion.coverage) {
        if (c.kind === 'unknown') errors.push(`${where} has unknown coverage "${c.raw}"`);
        if (c.planned && done) errors.push(`${where} (done) names "${c.kind}" without a target`);
        if (c.kind === 'gap' && !c.reason && done) {
          errors.push(
            `${where} (done) is a bare gap: add a test, mark device, or give gap: <reason>`,
          );
        }
        if (c.kind === 'gap' && done && c.reason) gaps.push({ story, criterion, reason: c.reason });
        if (c.kind === 'device') device.push({ story, criterion, note: c.note });
        if (!c.target) continue;
        if (c.kind === 'ui') {
          referencedCases.add(c.target);
          if (!exists(`verification/ui/cases/${c.target}.py`)) {
            errors.push(`${where} references missing UI case ${c.target}`);
          }
          continue;
        }
        if (!exists(c.target)) {
          errors.push(`${where} references missing file ${c.target}`);
        } else if (c.fragment && !read(c.target).includes(c.fragment)) {
          errors.push(`${where}: ${c.target} has no test matching "${c.fragment}"`);
        }
      }
    }
  }

  for (const name of uiCases ?? []) {
    if (!referencedCases.has(name)) warnings.push(`UI case ${name} is referenced by no criterion`);
  }

  return { activities, stories, errors, warnings, device, gaps };
}

export function summarize({ activities, stories, errors, warnings, device, gaps }) {
  const lines = [];
  const byStatus = STATUSES.map((s) => `${s} ${stories.filter((x) => x.status === s).length}`);
  const criteria = stories.flatMap((s) => s.criteria.map((c) => ({ story: s, ...c })));
  lines.push(
    `Story map: ${activities.length} activities, ${stories.length} stories (${byStatus.join(', ')})`,
  );
  const kinds = ['ui', 'unit', 'int', 'db', 'device', 'gap'];
  const counts = kinds.map((kind) => {
    const n = criteria.filter((c) => c.coverage.some((x) => x.kind === kind && !x.planned)).length;
    return `${kind} ${n}`;
  });
  const planned = criteria.filter(
    (c) => c.coverage.length === 0 || c.coverage.every((x) => x.planned),
  );
  lines.push(
    `Criteria: ${criteria.length}; covered by ${counts.join(', ')}; planned only ${planned.length}`,
  );
  lines.push('');
  lines.push(`Acknowledged gaps on done stories (${gaps.length}):`);
  for (const g of gaps)
    lines.push(`  GAP  ${g.criterion.id}: ${g.criterion.behaviour} — ${g.reason}`);
  lines.push('');
  lines.push(`Device checklist (${device.length}):`);
  for (const d of device) {
    const note = d.note ? ` (${d.note})` : '';
    lines.push(`  [${d.story.status}] ${d.criterion.id}: ${d.criterion.behaviour}${note}`);
  }
  if (warnings.length) {
    lines.push('');
    lines.push(`Warnings (${warnings.length}):`);
    for (const w of warnings) lines.push(`  WARN ${w}`);
  }
  lines.push('');
  if (errors.length) {
    lines.push(`Errors (${errors.length}):`);
    for (const e of errors) lines.push(`  FAIL ${e}`);
  } else {
    lines.push('Story map OK');
  }
  return lines.join('\n');
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const argIndex = process.argv.indexOf('--file');
  const file = argIndex > 0 ? process.argv[argIndex + 1] : 'docs/story-map.md';
  const text = readFileSync(join(root, file), 'utf8');
  const uiCases = readdirSync(join(root, 'verification/ui/cases'))
    .filter((name) => name.endsWith('.py'))
    .map((name) => name.slice(0, -3))
    .sort();
  const result = checkStoryMap(text, {
    exists: (path) => existsSync(join(root, path)),
    read: (path) => readFileSync(join(root, path), 'utf8'),
    mapDir: posix.dirname(file),
    uiCases,
  });
  console.log(summarize(result));
  process.exit(result.errors.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
