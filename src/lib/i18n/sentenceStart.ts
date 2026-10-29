import type { InitOptions, PostProcessorModule } from 'i18next';

export const sentenceStart: PostProcessorModule = {
  type: 'postProcessor',
  name: 'sentenceStart',
  process(value: string, _key: string | string[], options: { i18nResolved?: { res?: unknown } }) {
    const template = options.i18nResolved?.res;
    if (typeof template !== 'string' || !template.startsWith('{{')) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  },
};

// A value interpolated first (often the lower-case fallback 'pihak lain' / 'the other person') opens the sentence;
// fragments that start lower-case on purpose ('today', 'e.g. …') are left alone because their template does not.
export const sentenceStartOptions = {
  postProcess: ['sentenceStart'],
  postProcessPassResolved: true,
} as const satisfies InitOptions;
