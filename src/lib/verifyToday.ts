const DAY_MS = 24 * 3_600_000;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dayShift(now: Date, day: string | undefined): number {
  const match = day ? DAY.exec(day) : null;
  if (!match) return 0;
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / DAY_MS) * DAY_MS;
}

// Native views keep the real date; only JS time moves, by whole days so the wall-clock hour stays where the runner
// put it with the time zone.
export function shiftToday(day: string | undefined) {
  const RealDate = Date;
  const shift = dayShift(new RealDate(), day);
  if (shift === 0) return;
  class ShiftedDate extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor> | []) {
      if (args.length === 0) super(RealDate.now() + shift);
      else super(...(args as ConstructorParameters<DateConstructor>));
    }

    static now() {
      return RealDate.now() + shift;
    }
  }
  globalThis.Date = ShiftedDate as DateConstructor;
}
