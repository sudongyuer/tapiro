const pad = (value: number) => String(value).padStart(2, '0');

const keyOf = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateOf = (dayKey: string, hours = 0, minutes = 0) => {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
};

export function localDayKey(time: number) {
  return keyOf(new Date(time));
}

let clockStyle = { language: 'zh-Hans', uses24hourClock: true };

export function setClockStyle(language: string, uses24hourClock: boolean) {
  clockStyle = { language, uses24hourClock };
}

export function clockOptions(): Intl.DateTimeFormatOptions {
  return clockStyle.uses24hourClock
    ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
    : { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' };
}

export function localClock(time: number, language = clockStyle.language) {
  const date = new Date(time);
  if (clockStyle.uses24hourClock) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return new Intl.DateTimeFormat(language, clockOptions()).format(date);
}

export function localTimeOn(dayKey: string, hours: number, minutes: number) {
  return dateOf(dayKey, hours, minutes).getTime();
}

export function addDays(dayKey: string, days: number) {
  const date = dateOf(dayKey);
  date.setDate(date.getDate() + days);
  return keyOf(date);
}
