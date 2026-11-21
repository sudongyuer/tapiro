import { useEffect, useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { dateFormat } from '@/lib/intlCache';
import type { Sticker } from '@/lib/stickers';

import { bookFocus } from './services';

export function headerDate(language: string, iso: string) {
  return dateFormat(language, { weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(iso),
  );
}

export function useBookFocus(stickers: Sticker[]) {
  const { language } = useI18n();
  const [focus, setFocus] = useState<{ id: string | null; epoch: number }>({
    id: null,
    epoch: 0,
  });
  const found = stickers.findIndex((sticker) => sticker.id === focus.id);
  const index = Math.max(0, found);
  const sticker = stickers[index];
  useEffect(() => {
    bookFocus.show(sticker.id);
  }, [sticker.id]);

  useEffect(
    () =>
      bookFocus.subscribe(() => {
        const id = bookFocus.take();
        if (id) setFocus((now) => ({ id, epoch: now.epoch + 1 }));
      }),
    [],
  );

  return {
    index,
    sticker,
    epoch: focus.epoch,
    title: headerDate(language, sticker.earnedAt),
    turn: (next: number) =>
      setFocus((now) => ({ id: stickers[next]?.id ?? null, epoch: now.epoch })),
    jump: (next: number) =>
      setFocus((now) => ({ id: stickers[next]?.id ?? null, epoch: now.epoch + 1 })),
  };
}
