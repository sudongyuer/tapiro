import { Section, Text } from '@expo/ui/swift-ui';
import { useEffect, useState } from 'react';

import { CATEGORY_ART, handArtFor, nextHandArt, type HandArtId } from '@/lib/handArt';
import { useI18n } from '@/lib/i18n';
import { CURRENCIES, formatMoney } from '@/lib/money';
import type { BountyCategory } from '@/lib/stickers/category';
import { TaskCard } from '@/ui/TaskCard';

import { useTimeLine } from './timeLine';
import type { PostDraft } from './types';
import { parseReward } from './validate';

export const ART_SETTLE_MS = 500;

export function useShownArt(draft: {
  title: string;
  category: BountyCategory | null;
  art: HandArtId | null;
}): HandArtId {
  const typed = draft.title.trim();
  const resolved = typed ? handArtFor({ ...draft, title: typed }) : null;
  const [settled, setSettled] = useState(resolved);
  useEffect(() => {
    if (resolved === settled) return;
    const wait = resolved === null || draft.art !== null ? 0 : ART_SETTLE_MS;
    const timer = setTimeout(() => setSettled(resolved), wait);
    return () => clearTimeout(timer);
  }, [resolved, settled, draft.art]);
  const fallback = draft.category ? CATEGORY_ART[draft.category] : 'other';
  return draft.art ?? (resolved === null ? null : settled) ?? fallback;
}

export function PostLiveCard({
  draft,
  onSwap,
}: {
  draft: PostDraft;
  onSwap: (next: HandArtId) => void;
}) {
  const { t, language } = useI18n();
  const art = useShownArt(draft);
  const time = useTimeLine(draft.time);
  const title = draft.title.trim();
  const reward = parseReward(draft.rewardText, draft.currency);
  const amount = reward
    ? formatMoney(reward, language, { whole: true })
    : `${CURRENCIES[draft.currency].symbol} –`;
  const place = draft.place?.label.trim() || null;
  const meta =
    place && time
      ? t('bounty.post.confirm.meta', { place, time })
      : (place ?? time ?? t('bounty.post.live.noMeta'));
  return (
    <Section
      header={<Text>{t('bounty.post.live.header')}</Text>}
      footer={<Text>{t('bounty.post.live.swapHint')}</Text>}
    >
      <TaskCard
        art={art}
        artPress={{
          label: t('bounty.post.form.art', { name: t(`stickers.art.${art}`) }),
          onPress: () => onSwap(nextHandArt(art)),
        }}
        kicker={
          draft.category
            ? t(`bounty.category.${draft.category}`)
            : t('bounty.post.form.categoryPlaceholder')
        }
        title={title || t('bounty.post.live.title')}
        meta={meta}
        reward={amount}
        rewardLabel={t('bounty.post.confirm.rewardLabel', { amount })}
        titleLines={1}
        placeholder={{ title: !title, reward: !reward }}
        testID="bounty-post-live"
      />
    </Section>
  );
}
