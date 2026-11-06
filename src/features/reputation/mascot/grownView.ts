import type { TFunction } from 'i18next';

import { accessoryLevel, levelNameKey } from '../model';
import { ACCESSORIES, type Accessory, type MyMascot } from '../types';

export type GrownMoment = { from: number; to: number; stickers: number; wear: Accessory | null };

export const grownMoment = (mascot: MyMascot): GrownMoment => ({
  from: mascot.seenLevel,
  to: mascot.level,
  stickers: mascot.stickers,
  wear: mascot.accessory,
});

export const newAccessories = ({ from, to }: GrownMoment) =>
  ACCESSORIES.filter((accessory) => {
    const level = accessoryLevel(accessory);
    return level > from && level <= to;
  });

export function grownLines(moment: GrownMoment, t: TFunction) {
  return {
    progress: t('reputation.grown.progress', {
      count: moment.stickers,
      from: moment.from,
      to: moment.to,
    }),
    title: t('reputation.grown.title', {
      name: t(levelNameKey(moment.to) as 'reputation.level.lv1'),
    }),
    unlocked: newAccessories(moment).map((accessory) => ({
      accessory,
      line: t('reputation.grown.unlockedRow', {
        level: accessoryLevel(accessory),
        name: t(`reputation.accessory.${accessory}`),
      }),
    })),
  };
}
