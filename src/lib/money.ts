export function formatRinggit(sen: number, locale: string) {
  // Apple's locale data (used by Hermes on iOS) spells MYR as the ISO code in zh-Hans and en and
  // ignores currencyDisplay 'narrowSymbol'; Malaysians read RM in every language. Hermes's
  // formatToParts crashed the app with heap corruption on the iOS 26 Simulator, so swap the text.
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MYR' })
    .format(sen / 100)
    .replace('MYR', 'RM');
}
