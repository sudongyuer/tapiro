#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseStoryMap } from './check-story-map.mjs';

const COLUMN = 264;
const GUTTER = 16;
const PAD = 32;
const HEADER = 92;
const TOP = 176;
const CARD_GAP = 12;
const RELEASE_GAP = 44;
const TEXT_WIDTH = COLUMN - 28;
const STATUS = {
  done: { label: '已完成', className: 'done' },
  building: { label: '进行中', className: 'building' },
  planned: { label: '计划中', className: 'planned' },
};
const KIND_LABEL = { ui: 'UI', unit: '单元', int: '集成', db: '数据库', device: '真机' };

const escape = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function textLines(text, size) {
  const units = [...text].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.56), 0);
  return Math.max(1, Math.ceil((units * size) / TEXT_WIDTH));
}

export function storyCounts(story) {
  const counts = {};
  let missing = 0;
  let planned = 0;
  for (const criterion of story.criteria) {
    const real = criterion.coverage.filter(
      (c) => !c.planned && c.kind !== 'gap' && c.kind !== 'unknown',
    );
    for (const kind of new Set(real.map((c) => c.kind))) counts[kind] = (counts[kind] ?? 0) + 1;
    if (real.length > 0) continue;
    if (story.status === 'planned' || story.status === 'building') {
      if (!criterion.coverage.some((c) => c.kind === 'gap')) {
        planned += 1;
        continue;
      }
    }
    missing += 1;
  }
  return { counts, missing, planned, total: story.criteria.length };
}

function cardHeight(story) {
  const title = textLines(story.title, 14) * 20;
  const { missing } = storyCounts(story);
  return 14 + 16 + 6 + title + 8 + 18 + (missing ? 20 : 0) + 14;
}

function card(story, x, y) {
  const status = STATUS[story.status] ?? STATUS.planned;
  const { counts, missing, planned, total } = storyCounts(story);
  const parts = Object.entries(KIND_LABEL)
    .filter(([kind]) => counts[kind])
    .map(([kind, label]) => `${label} ${counts[kind]}`);
  if (planned) parts.push(`待写 ${planned}`);
  const line = `${total} 条标准${parts.length ? ' · ' + parts.join(' · ') : ''}`;
  const gap = missing ? `<div class="gap">缺测试 ${missing}</div>` : '';
  return (
    `<div class="card ${status.className}" style="left:${x}px;top:${y}px;width:${COLUMN}px;height:${cardHeight(story)}px">` +
    `<div class="row"><span class="id">${escape(story.id)}</span><span class="pill">${status.label}</span></div>` +
    `<div class="title">${escape(story.title)}</div>` +
    `<div class="counts">${escape(line)}</div>${gap}</div>`
  );
}

export function renderBoard(activities) {
  const releases = ['v1', 'later'];
  const width = PAD * 2 + activities.length * COLUMN + (activities.length - 1) * GUTTER;
  const bandTop = {};
  const bandHeight = {};
  let y = TOP;
  for (const release of releases) {
    bandTop[release] = y;
    const tallest = Math.max(
      0,
      ...activities.map((activity) =>
        activity.stories
          .filter((s) => (s.release === 'later' ? 'later' : 'v1') === release)
          .reduce((sum, s) => sum + cardHeight(s) + CARD_GAP, 0),
      ),
    );
    bandHeight[release] = Math.max(tallest, 40);
    y += bandHeight[release] + RELEASE_GAP;
  }
  const height = y + PAD - RELEASE_GAP;
  const stories = activities.flatMap((a) => a.stories);
  const byStatus = Object.keys(STATUS).map(
    (s) => `${STATUS[s].label} ${stories.filter((x) => x.status === s).length}`,
  );
  const missing = stories.reduce((sum, s) => sum + storyCounts(s).missing, 0);

  const out = [];
  out.push(
    `<div class="head" style="left:${PAD}px;top:${PAD - 8}px;width:${width - PAD * 2}px">` +
      `<div class="h1">用户故事地图</div>` +
      `<div class="sub">由 docs/story-map.md 生成 · ${activities.length} 个活动 · ${stories.length} 个故事（${byStatus.join(' · ')}）` +
      `${missing ? ` · <span class="red">缺测试 ${missing}</span>` : ''}</div>` +
      `<div class="legend"><span class="pill done">已完成</span><span class="pill building">进行中</span>` +
      `<span class="pill planned">计划中</span></div></div>`,
  );
  for (const release of releases) {
    const top = bandTop[release] - 22;
    out.push(
      `<div class="release" style="left:${PAD}px;top:${top}px;width:${width - PAD * 2}px">` +
        `<span>${release === 'v1' ? 'v1 第一版' : 'later 以后'}</span></div>`,
    );
  }
  activities.forEach((activity, index) => {
    const x = PAD + index * (COLUMN + GUTTER);
    out.push(
      `<div class="activity" style="left:${x}px;top:${HEADER + 4}px;width:${COLUMN}px">` +
        `<span class="step">${index + 1}</span>${escape(activity.name)}</div>`,
    );
    for (const release of releases) {
      let cy = bandTop[release];
      for (const story of activity.stories.filter(
        (s) => (s.release === 'later' ? 'later' : 'v1') === release,
      )) {
        out.push(card(story, x, cy));
        cy += cardHeight(story) + CARD_GAP;
      }
    }
  });

  const style = `
.board{position:relative;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif;color:#25232b}
.board>div{position:absolute;box-sizing:border-box}
.h1{font-size:24px;font-weight:700;line-height:30px}
.sub{font-size:13px;color:#5f5a66;line-height:20px;margin-top:2px}
.legend{position:absolute;right:0;top:4px;display:flex;gap:8px}
.red{color:#c4302b;font-weight:600}
.activity{height:40px;padding:0 12px;border-radius:10px;background:#25232b;color:#ffffff;font-size:15px;font-weight:600;line-height:40px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.step{display:inline-block;min-width:20px;margin-right:8px;color:#c9c4cf;font-variant-numeric:tabular-nums}
.release{height:1px;border-top:1px dashed #8a8492}
.release span{position:absolute;left:0;top:-10px;padding:0 8px 0 0;background:#faf8f5;font-size:12px;font-weight:600;color:#5f5a66;line-height:18px}
.card{padding:14px;border-radius:12px;border:1px solid;background:#ffffff}
.card.done{background:#eef7ee;border-color:#9cc79c}
.card.building{background:#fff6e5;border-color:#e3b765}
.card.planned{background:#f3f2f5;border-color:#cfcbd5}
.row{display:flex;justify-content:space-between;align-items:center;height:16px}
.id{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#5f5a66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:8px}
.pill{display:inline-block;padding:0 8px;border-radius:9px;font-size:11px;font-weight:600;line-height:18px;white-space:nowrap}
.pill.done,.done .pill{background:#2f7d32;color:#ffffff}
.pill.building,.building .pill{background:#a86500;color:#ffffff}
.pill.planned,.planned .pill{background:#6b6574;color:#ffffff}
.title{margin-top:6px;font-size:14px;font-weight:600;line-height:20px}
.counts{margin-top:8px;font-size:12px;color:#4a4552;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gap{margin-top:2px;font-size:12px;font-weight:700;color:#c4302b;line-height:18px}
`.trim();

  return (
    `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8"><title>用户故事地图</title>` +
    `<script src="./support.js"></script></head><body><x-dc><helmet><style>${style}</style></helmet>` +
    `<div class="board" style="width:${width}px;height:${height}px">${out.join('')}</div></x-dc>` +
    `<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${width},"height":${height}}}'>` +
    `class Component extends DCLogic { renderVals() { return {}; } }</script></body></html>\n`
  );
}

function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node scripts/story-map-board.mjs <out.dc.html>');
    process.exit(2);
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const activities = parseStoryMap(readFileSync(join(root, 'docs/story-map.md'), 'utf8'));
  const html = renderBoard(activities);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), html);
  console.log(`${resolve(out)} (${Buffer.byteLength(html)} bytes)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
