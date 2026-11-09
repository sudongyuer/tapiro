export const AI_TASKS = ['draft_bounty', 'answer', 'translate'] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const TRANSLATE_LANGUAGES = ['zh-Hans', 'en', 'ms'] as const;
export const INPUT_TEXT_MAX = 2000;
const OUTPUT_TEXT_MAX = 4000;

export type AiInput = { text: string; to?: (typeof TRANSLATE_LANGUAGES)[number] };
export type AiRequest = { task: AiTask; input: AiInput };

type Schema = {
  type: string | readonly string[];
  properties?: Readonly<Record<string, Schema>>;
  required?: readonly string[];
  additionalProperties?: boolean;
  enum?: readonly unknown[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  description?: string;
};

export type ToolSchema = { name: AiTask; description: string; parameters: Schema };

const DATE_TIME_NOTE = 'ISO 8601 with a UTC offset, or null';

// The app parses this shape in src/lib/drafts/bountyDraft.ts; contract.test.ts keeps the two in step. Null means the
// user did not say. A place has no field for coordinates because a model cannot be trusted to produce them.
export const TOOL_SCHEMAS: Readonly<Record<AiTask, ToolSchema>> = {
  draft_bounty: {
    name: 'draft_bounty',
    description:
      "Fill the bounty post form from the user's words. The user reviews it and publishes it themselves.",
    parameters: {
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
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function hasType(value: unknown, type: string) {
  if (type === 'null') return value === null;
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

const OFFSET_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const isDateTime = (value: unknown) =>
  typeof value === 'string' && OFFSET_DATE_TIME.test(value) && !Number.isNaN(Date.parse(value));

function validDraftTime(args: Record<string, unknown>) {
  const { deadlineAt, startsAt, endsAt } = args;
  if (deadlineAt === null && startsAt === null && endsAt === null) return true;
  if (deadlineAt !== null) return startsAt === null && endsAt === null && isDateTime(deadlineAt);
  return (
    isDateTime(startsAt) &&
    isDateTime(endsAt) &&
    Date.parse(endsAt as string) > Date.parse(startsAt as string)
  );
}

export function validToolResult(task: AiTask, args: unknown) {
  if (!matches(TOOL_SCHEMAS[task].parameters, args)) return false;
  return task !== 'draft_bounty' || validDraftTime(args as Record<string, unknown>);
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
  const { text, to } = body.input;
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (trimmed === '' || [...trimmed].length > INPUT_TEXT_MAX) return null;
  if (task === 'translate') {
    const language = TRANSLATE_LANGUAGES.find((candidate) => candidate === to);
    if (!language || !exactKeys(body.input, ['text', 'to'])) return null;
    return { task, input: { text: trimmed, to: language } };
  }
  if (!exactKeys(body.input, ['text'])) return null;
  return { task, input: { text: trimmed } };
}
