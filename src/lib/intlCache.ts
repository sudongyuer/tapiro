const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

// A formatter fixes the default time zone when it is built. Tests switch zones through process.env.TZ and the device
// can change zone while the app runs (Hermes leaves TZ empty), so the key carries both the variable and the offset.
const defaultZone = () => `${globalThis.process?.env?.TZ ?? ''}${new Date().getTimezoneOffset()}`;

export function numberFormat(locale: string, options?: Intl.NumberFormatOptions) {
  const key = `${locale}|${JSON.stringify(options ?? {})}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format;
}

export function dateFormat(locale: string, options?: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${defaultZone()}|${JSON.stringify(options ?? {})}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    dateFormats.set(key, format);
  }
  return format;
}
