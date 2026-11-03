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

export function localClock(time: number) {
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localTimeOn(dayKey: string, hours: number, minutes: number) {
  return dateOf(dayKey, hours, minutes).getTime();
}

export function addDays(dayKey: string, days: number) {
  const date = dateOf(dayKey);
  date.setDate(date.getDate() + days);
  return keyOf(date);
}
