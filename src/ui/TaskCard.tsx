import { StyleSheet, View } from 'react-native';

import type { BountyCategory } from '@/lib/stickers';

import { AppText } from './AppText';
import { CategorySticker } from './CategorySticker';
import { vars } from './theme/tokens';

const STICKER = 44;

export function TaskCard({
  category,
  title,
  meta,
  reward,
  rewardLabel,
  titleLines = 2,
  testID,
}: {
  category: BountyCategory;
  title: string;
  meta: string | null;
  reward: string;
  rewardLabel: string;
  titleLines?: number;
  testID: string;
}) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={[title, meta, rewardLabel].filter(Boolean).join(', ')}
      testID={testID}
    >
      <CategorySticker category={category} size={STICKER} />
      <View style={styles.text}>
        <AppText variant="title" numberOfLines={titleLines}>
          {title}
        </AppText>
        {meta ? (
          <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
            {meta}
          </AppText>
        ) : null}
      </View>
      <AppText variant="reward">{reward}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    paddingVertical: vars['--space-2'],
  },
  text: { flex: 1, gap: vars['--space-1'] },
});
