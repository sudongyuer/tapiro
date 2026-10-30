#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { DRAWINGS, svgFor } from './drawings.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const APP_DIR = 'assets/hand-art';
export const KIT_DIR = 'modules/tapiro-kit/ios/HandArt';
const SIZE = 512;
const BORDER = 12;

function main() {
  const { values } = parseArgs({ options: { ids: { type: 'string' } } });
  const ids = values.ids ? values.ids.split(',') : Object.keys(DRAWINGS);
  const scratch = mkdtempSync(join(tmpdir(), 'hand-art-'));
  mkdirSync(APP_DIR, { recursive: true });
  mkdirSync(KIT_DIR, { recursive: true });
  for (const id of ids) {
    const page = join(scratch, `${id}.html`);
    writeFileSync(page, svgFor(id, { size: SIZE, border: BORDER }));
    const out = join(APP_DIR, `${id}.png`);
    rmSync(out, { force: true });
    spawnSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--default-background-color=00000000',
        `--window-size=${SIZE},${SIZE}`,
        `--screenshot=${join(process.cwd(), out)}`,
        `file://${page}`,
      ],
      { timeout: 30000 },
    );
    if (!existsSync(out)) throw new Error(`Chrome wrote no screenshot for ${id}`);
    copyFileSync(out, join(KIT_DIR, `hand-art-${id}.png`));
    console.log(`ok ${id}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
