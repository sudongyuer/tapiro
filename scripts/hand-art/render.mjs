#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { DRAWINGS, PANTRY_DRAWINGS, svgFor, WEAR_DRAWINGS, wearSvgFor } from './drawings.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const APP_DIR = 'assets/hand-art';
export const KIT_DIR = 'modules/tapiro-kit/ios/HandArt';
export const PANTRY_DIR = 'assets/pantry';
export const WEAR_DIR = 'assets/wear';
const SIZE = 512;
const WEAR_SIZE = 384;
const BORDER = 12;

function main() {
  const { values } = parseArgs({ options: { ids: { type: 'string' }, set: { type: 'string' } } });
  const pantry = values.set === 'pantry';
  const wear = values.set === 'wear';
  const set = wear ? WEAR_DRAWINGS : pantry ? PANTRY_DRAWINGS : DRAWINGS;
  const ids = values.ids ? values.ids.split(',') : Object.keys(set);
  const appDir = wear ? WEAR_DIR : pantry ? PANTRY_DIR : APP_DIR;
  const size = wear ? WEAR_SIZE : SIZE;
  const scratch = mkdtempSync(join(tmpdir(), 'hand-art-'));
  mkdirSync(appDir, { recursive: true });
  mkdirSync(KIT_DIR, { recursive: true });
  for (const id of ids) {
    const page = join(scratch, `${id}.html`);
    writeFileSync(page, wear ? wearSvgFor(id, { size }) : svgFor(id, { size, border: BORDER }));
    const out = join(appDir, `${id}.png`);
    rmSync(out, { force: true });
    spawnSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--default-background-color=00000000',
        `--window-size=${size},${size}`,
        `--screenshot=${join(process.cwd(), out)}`,
        `file://${page}`,
      ],
      { timeout: 30000 },
    );
    if (!existsSync(out)) throw new Error(`Chrome wrote no screenshot for ${id}`);
    if (!pantry && !wear) copyFileSync(out, join(KIT_DIR, `hand-art-${id}.png`));
    console.log(`ok ${id}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
