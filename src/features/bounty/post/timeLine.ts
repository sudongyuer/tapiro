import { useI18n } from '@/lib/i18n';

import { timeLine } from './timeText';
import type { TimeChoice } from './types';

export function useTimeLine(time: TimeChoice) {
  const { t, language } = useI18n();
  return timeLine(time, t, language, new Date());
}
