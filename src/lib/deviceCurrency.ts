import { getLocales } from 'expo-localization';

import { defaultCurrency } from './money';

export function deviceCurrency() {
  return defaultCurrency(getLocales()[0]?.currencyCode);
}
