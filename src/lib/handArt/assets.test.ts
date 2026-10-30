import { expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HAND_ART_IDS } from './ids';

const ROOT = join(import.meta.dir, '../../..');
const APP = join(ROOT, 'assets/hand-art');
const KIT = join(ROOT, 'modules/tapiro-kit/ios/HandArt');

test('every art id ships one PNG in the app and the same bytes in the kit, and nothing else', () => {
  expect(readdirSync(APP).sort()).toEqual(HAND_ART_IDS.map((id) => `${id}.png`).sort());
  expect(readdirSync(KIT).sort()).toEqual(HAND_ART_IDS.map((id) => `hand-art-${id}.png`).sort());
  for (const id of HAND_ART_IDS) {
    expect(
      readFileSync(join(KIT, `hand-art-${id}.png`)).equals(readFileSync(join(APP, `${id}.png`))),
    ).toBe(true);
  }
});
