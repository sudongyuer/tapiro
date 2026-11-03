import { getLocales } from 'expo-localization';

import type { DecimalSeparator } from './money';

export function deviceDecimal(): DecimalSeparator {
  return getLocales()[0]?.decimalSeparator === ',' ? ',' : '.';
}
