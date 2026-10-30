import type { PostProcessorModule } from 'i18next';

const HAN = '\\p{Script=Han}';
const LATIN_THEN_HAN = new RegExp(`([A-Za-z])(?=${HAN})`, 'gu');
const HAN_THEN_LATIN = new RegExp(`(${HAN})(?=[A-Za-z])`, 'gu');

// The copy already spaces its own Latin words; this spaces the interpolated ones, so 「Lily 帮我」 but 「小林帮我」.
export const latinSpacing: PostProcessorModule = {
  type: 'postProcessor',
  name: 'latinSpacing',
  process(value: string, _key: string | string[], options: { lng?: string }, translator) {
    const lng = options.lng ?? translator?.language;
    if (!lng?.startsWith('zh')) return value;
    return value.replace(LATIN_THEN_HAN, '$1 ').replace(HAN_THEN_LATIN, '$1 ');
  },
};
