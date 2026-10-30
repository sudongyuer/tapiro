#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const CREDENTIALS = join(homedir(), '.config/tapiro/modelstudio.json');

export const STYLES = {
  crayon:
    "Style: hand-drawn children's-book crayon illustration. Thick, slightly wobbly dark-brown outline (#3A2E2A) of even weight around every shape. Flat colour fills with visible wax-crayon grain and tiny paper-white specks; fills stop just short of the outline in places. One flat darker tone on the side away from the light, no other shading. Chunky, simplified shapes that stay readable at 32 px.",
  yarn: 'Style: tufted-rug / punch-needle yarn illustration, like a handmade wool sticker. Every shape is made of dense, short wool loops with a fuzzy edge; no drawn outline. Colours are flat yarn blocks with a faint sheen; details appear only as changes of yarn colour. Chunky, rounded, simplified shapes.',
  wash: 'Style: light watercolour illustration on white paper. Thin, loose warm-grey pencil outline. Soft transparent washes that bleed slightly past the lines, visible cold-press paper texture, a little white paper left inside each shape. Calm and airy.',
};

export const SUBJECTS = {
  'pickup.parcel': 'a closed cardboard parcel box with a strip of packing tape and a small label',
  'buy.tea': 'a takeaway cup of brown-sugar bubble milk tea with tapioca pearls and a red straw',
  'accompany.hospital':
    'two students walking side by side, one holding a small bag, toward a little clinic door with a red cross',
};

export const NEGATIVE =
  'text, letters, words, numbers, logo, brand, watermark, signature, frame, border, background scenery, ground shadow, photorealistic, photo, 3d render, CGI, glossy, gradient, lens flare, detailed face, realistic skin';

export function promptFor(subject, style) {
  return [
    `Subject: ${SUBJECTS[subject]}.`,
    'Composition: one subject only, centred, seen in three-quarter view from slightly above, filling about 75% of a square canvas. Plain pure-white background (or transparent if the model supports it). Nothing else in the frame: no ground, no cast shadow, no scenery.',
    STYLES[style],
    'Palette: warm and muted, at most five colours per image, chosen from terracotta red #E2554B, caramel #C9935B, cream #F0DDB0, sage green #7FA96B, dusty blue #5B8DB8, ink brown #3A2E2A. Keep the same palette, line weight and top-left light across the whole set.',
    'People, if any: simple round heads, dot eyes, no detailed faces, no specific ethnicity cues beyond hair colour.',
    'Avoid: text, letters, numbers, logos, brand marks, watermark, frame or border, photorealism, 3D render, glossy gradients, lens effects.',
  ].join('\n\n');
}

async function generate({ apiKey, workspaceId }, model, prompt, seed) {
  const url = `https://${workspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
      parameters: {
        size: '1024*1024',
        n: 1,
        negative_prompt: NEGATIVE,
        prompt_extend: false,
        watermark: false,
        seed,
      },
    }),
  });
  const body = await response.json();
  const image = body.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!response.ok || !image)
    throw new Error(`${response.status} ${body.code ?? ''} ${body.message ?? ''}`);
  return image;
}

async function main() {
  const { values } = parseArgs({
    options: {
      out: { type: 'string' },
      model: { type: 'string', default: 'qwen-image-2.1-pro' },
      styles: { type: 'string', default: Object.keys(STYLES).join(',') },
      subjects: { type: 'string', default: Object.keys(SUBJECTS).join(',') },
      seed: { type: 'string', default: '7' },
    },
  });
  if (!values.out) throw new Error('--out <dir> is required');
  const credentials = JSON.parse(readFileSync(CREDENTIALS, 'utf8'));
  mkdirSync(values.out, { recursive: true });
  const log = [];
  for (const style of values.styles.split(',')) {
    for (const subject of values.subjects.split(',')) {
      const prompt = promptFor(subject, style);
      const started = Date.now();
      try {
        const url = await generate(credentials, values.model, prompt, Number(values.seed));
        const file = join(values.out, `${style}-${subject}.png`);
        writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
        log.push({ style, subject, file, ms: Date.now() - started, prompt });
        console.log(`ok ${style} ${subject} ${Date.now() - started} ms`);
      } catch (error) {
        log.push({ style, subject, error: String(error), prompt });
        console.log(`failed ${style} ${subject}: ${error}`);
      }
    }
  }
  writeFileSync(join(values.out, 'log.json'), JSON.stringify(log, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
