export const AI_TASKS = ['draft_bounty', 'answer', 'translate', 'ask', 'transcribe'] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const AI_TOOLS = [
  'draft_bounty',
  'answer',
  'translate',
  'clarify',
  'pick',
  'transcript',
] as const;
export type AiTool = (typeof AI_TOOLS)[number];

export const TRANSLATE_LANGUAGES = ['zh-Hans', 'en', 'ms'] as const;
export const INPUT_TEXT_MAX = 2000;
export const IMAGE_DATA_MAX = 1_400_000;
export const AUDIO_DATA_MAX = 1_400_000;
const OUTPUT_TEXT_MAX = 4000;

export type AiLanguage = (typeof TRANSLATE_LANGUAGES)[number];
export type AiImage = { mediaType: 'image/jpeg'; data: string };
export type AiAudio = { mediaType: 'audio/mp4'; data: string };
export type AiInput = { text: string; to?: AiLanguage; image?: AiImage };
export type AiRequest =
  | { task: Exclude<AiTask, 'transcribe'>; input: AiInput }
  | { task: 'transcribe'; input: { audio: AiAudio; language: AiLanguage } };

type Schema = {
  type: string | readonly string[];
  properties?: Readonly<Record<string, Schema>>;
  required?: readonly string[];
  additionalProperties?: boolean;
  enum?: readonly unknown[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  description?: string;
};

export type ToolSchema = { name: AiTool; description: string; parameters: Schema };

const DATE_TIME_NOTE = 'ISO 8601 with a UTC offset, or null';

// The app parses this shape in src/lib/drafts/bountyDraft.ts; contract.test.ts keeps the two in step. Null means the
// user did not say. A place has no field for coordinates because a model cannot be trusted to produce them.
const DRAFT_BOUNTY_PARAMETERS: Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'category',
    'rewardMajor',
    'currency',
    'description',
    'deadlineAt',
    'startsAt',
    'endsAt',
    'placeHint',
  ],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 60 },
    category: {
      type: ['string', 'null'],
      enum: ['pickup', 'buy', 'queue', 'handle', 'move', 'accompany', 'study', 'other', null],
    },
    rewardMajor: { type: ['integer', 'null'], minimum: 1 },
    currency: { type: ['string', 'null'], enum: ['MYR', 'CNY', null] },
    description: { type: ['string', 'null'], minLength: 1, maxLength: 500 },
    deadlineAt: { type: ['string', 'null'], description: DATE_TIME_NOTE },
    startsAt: { type: ['string', 'null'], description: DATE_TIME_NOTE },
    endsAt: { type: ['string', 'null'], description: DATE_TIME_NOTE },
    placeHint: { type: ['string', 'null'], minLength: 1, maxLength: 80 },
  },
};

export const CLARIFY_LIMITS = { questionMax: 80, choiceMax: 24, choicesMax: 3 } as const;
export const PICK_LIMITS = { summaryMax: 60, itemsMin: 2, itemsMax: 4 } as const;

export const TOOL_SCHEMAS: Readonly<Record<AiTool, ToolSchema>> = {
  draft_bounty: {
    name: 'draft_bounty',
    description:
      "Fill the bounty post form from the user's words. The user reviews it and publishes it themselves.",
    parameters: DRAFT_BOUNTY_PARAMETERS,
  },
  clarify: {
    name: 'clarify',
    description:
      'Ask the one thing the draft most needs, with up to three likely answers. The app adds a skip button.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['question', 'choices'],
      properties: {
        question: { type: 'string', minLength: 1, maxLength: CLARIFY_LIMITS.questionMax },
        choices: {
          type: 'array',
          minItems: 1,
          maxItems: CLARIFY_LIMITS.choicesMax,
          items: { type: 'string', minLength: 1, maxLength: CLARIFY_LIMITS.choiceMax },
        },
      },
    },
  },
  pick: {
    name: 'pick',
    description:
      'The image holds several requests: draft each one so the user can pick which to post.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: PICK_LIMITS.itemsMin,
          maxItems: PICK_LIMITS.itemsMax,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['summary', 'draft'],
            properties: {
              summary: { type: 'string', minLength: 1, maxLength: PICK_LIMITS.summaryMax },
              draft: DRAFT_BOUNTY_PARAMETERS,
            },
          },
        },
      },
    },
  },
  answer: {
    name: 'answer',
    description: "Answer the user's question in the sheet.",
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['text'],
      properties: { text: { type: 'string', minLength: 1, maxLength: OUTPUT_TEXT_MAX } },
    },
  },
  translate: {
    name: 'translate',
    description: 'Translate the given message into the target language.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['text'],
      properties: { text: { type: 'string', minLength: 1, maxLength: OUTPUT_TEXT_MAX } },
    },
  },
  transcript: {
    name: 'transcript',
    description:
      "Write down what the user said, in the language they spoke. Empty when nothing was said. The app puts it in the user's field; nothing is sent.",
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['text'],
      properties: { text: { type: 'string', maxLength: INPUT_TEXT_MAX } },
    },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function hasType(value: unknown, type: string) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isSafeInteger(value);
  if (type === 'object') return isRecord(value);
  return typeof value === type;
}

function matches(schema: Schema, value: unknown): boolean {
  const types = typeof schema.type === 'string' ? [schema.type] : schema.type;
  if (!types.some((type) => hasType(value, type))) return false;
  if (value === null) return true;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (typeof value === 'string') {
    const length = [...value.trim()].length;
    if (schema.minLength !== undefined && length < schema.minLength) return false;
    if (schema.maxLength !== undefined && length > schema.maxLength) return false;
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum)
    return false;
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return false;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    const items = schema.items;
    return items === undefined || value.every((item) => matches(items, item));
  }
  if (isRecord(value) && schema.properties) {
    const properties = schema.properties;
    if (
      schema.additionalProperties === false &&
      Object.keys(value).some((key) => !Object.hasOwn(properties, key))
    ) {
      return false;
    }
    if (schema.required?.some((key) => !Object.hasOwn(value, key))) return false;
    return Object.entries(value).every(([key, field]) => matches(properties[key], field));
  }
  return true;
}

const OFFSET_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

// Date.parse rolls an impossible day such as 11-31 over to the next month instead of refusing it.
function isDateTime(value: unknown) {
  if (typeof value !== 'string') return false;
  const match = OFFSET_DATE_TIME.exec(value);
  if (!match || Number.isNaN(Date.parse(value))) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day;
}

function validDraftTime(args: Record<string, unknown>): boolean {
  const { deadlineAt, startsAt, endsAt } = args;
  if (deadlineAt === null && startsAt === null && endsAt === null) return true;
  if (deadlineAt !== null) return startsAt === null && endsAt === null && isDateTime(deadlineAt);
  return (
    isDateTime(startsAt) &&
    isDateTime(endsAt) &&
    Date.parse(endsAt as string) > Date.parse(startsAt as string)
  );
}

export function validToolResult(tool: AiTool, args: unknown) {
  if (!matches(TOOL_SCHEMAS[tool].parameters, args)) return false;
  if (tool === 'draft_bounty') return validDraftTime(args as Record<string, unknown>);
  if (tool === 'pick') {
    const { items } = args as { items: { draft: Record<string, unknown> }[] };
    return items.every((item) => validDraftTime(item.draft));
  }
  return true;
}

// A follow-up goes back as text only, so a question asked about an image would lose the image: with an image the model
// drafts, answers or offers a pick, and never asks back.
export function toolsFor(request: AiRequest): AiTool[] {
  if (request.task === 'transcribe') return ['transcript'];
  if (request.task !== 'ask') return [request.task];
  return request.input.image
    ? ['draft_bounty', 'answer', 'pick']
    : ['draft_bounty', 'answer', 'clarify'];
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const JPEG_BASE64_START = '/9j/';

function parseImage(value: unknown): AiImage | null {
  if (!isRecord(value) || !exactKeys(value, ['mediaType', 'data'])) return null;
  const { mediaType, data } = value;
  if (mediaType !== 'image/jpeg' || typeof data !== 'string') return null;
  if (data.length > IMAGE_DATA_MAX || data.length % 4 !== 0 || !BASE64.test(data)) return null;
  return data.startsWith(JPEG_BASE64_START) ? { mediaType, data } : null;
}

const MP4_BRAND = 'ftyp';

function parseAudio(value: unknown): AiAudio | null {
  if (!isRecord(value) || !exactKeys(value, ['mediaType', 'data'])) return null;
  const { mediaType, data } = value;
  if (mediaType !== 'audio/mp4' || typeof data !== 'string') return null;
  if (data.length > AUDIO_DATA_MAX || data.length % 4 !== 0 || !BASE64.test(data)) return null;
  return atob(data.slice(0, 12)).slice(4, 8) === MP4_BRAND ? { mediaType, data } : null;
}

function parseTranscribe(input: Record<string, unknown>): AiRequest | null {
  if (!exactKeys(input, ['audio', 'language'])) return null;
  const audio = parseAudio(input.audio);
  const language = TRANSLATE_LANGUAGES.find((candidate) => candidate === input.language);
  return audio && language ? { task: 'transcribe', input: { audio, language } } : null;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const present = Object.keys(value);
  return present.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

// Requests carry only what the task needs, so anything extra (a payee method, another user's data) is refused here.
export function parseAiRequest(body: unknown): AiRequest | null {
  if (!isRecord(body) || !exactKeys(body, ['task', 'input']) || !isRecord(body.input)) return null;
  const task = AI_TASKS.find((candidate) => candidate === body.task);
  if (!task) return null;
  if (task === 'transcribe') return parseTranscribe(body.input);
  const { text, to } = body.input;
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if ([...trimmed].length > INPUT_TEXT_MAX) return null;
  if (task === 'ask' && Object.hasOwn(body.input, 'image')) {
    const image = parseImage(body.input.image);
    if (!image || !exactKeys(body.input, ['text', 'image'])) return null;
    return { task, input: { text: trimmed, image } };
  }
  if (trimmed === '') return null;
  if (task === 'translate') {
    const language = TRANSLATE_LANGUAGES.find((candidate) => candidate === to);
    if (!language || !exactKeys(body.input, ['text', 'to'])) return null;
    return { task, input: { text: trimmed, to: language } };
  }
  if (!exactKeys(body.input, ['text'])) return null;
  return { task, input: { text: trimmed } };
}
