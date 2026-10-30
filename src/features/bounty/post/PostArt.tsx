import { Button, RNHostView } from '@expo/ui/swift-ui';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe, ReduceMotion } from 'react-native-reanimated';

import { handArtFor, nextHandArt, type HandArtId } from '@/lib/handArt';
import { useI18n } from '@/lib/i18n';
import type { BountyCategory } from '@/lib/stickers/category';
import { HandArt } from '@/ui/HandArt';
import { vars } from '@/ui/theme/tokens';

import { fullRow, ROW_INSETS } from './FieldRow';

export const ART_SETTLE_MS = 500;
const ART_SIZE = 120;

const ARRIVE = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.88 }, { rotate: '-4deg' }] },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }, { rotate: '0deg' }],
    easing: Easing.out(Easing.cubic),
  },
})
  .duration(240)
  .reduceMotion(ReduceMotion.System);

export function useShownArt(draft: {
  title: string;
  category: BountyCategory | null;
  art: HandArtId | null;
}): HandArtId | null {
  const typed = draft.title.trim();
  const resolved = typed ? handArtFor({ ...draft, title: typed }) : null;
  const [settled, setSettled] = useState(resolved);
  useEffect(() => {
    if (resolved === settled) return;
    const wait = resolved === null || draft.art !== null ? 0 : ART_SETTLE_MS;
    const timer = setTimeout(() => setSettled(resolved), wait);
    return () => clearTimeout(timer);
  }, [resolved, settled, draft.art]);
  if (resolved === null) return null;
  return draft.art ?? settled;
}

export function PostArt({ id }: { id: HandArtId }) {
  const { t } = useI18n();
  return (
    <View
      style={styles.stage}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('bounty.post.form.art', { name: t(`stickers.art.${id}`) })}
      testID={`bounty-post-art-${id}`}
    >
      <Animated.View key={id} entering={ARRIVE}>
        <HandArt id={id} size={ART_SIZE} />
      </Animated.View>
    </View>
  );
}

export function ArtRows({
  id,
  onSwap,
}: {
  id: HandArtId | null;
  onSwap: (next: HandArtId) => void;
}) {
  const { t } = useI18n();
  if (id === null) return null;
  return (
    <>
      <RNHostView matchContents={{ vertical: true }}>
        <PostArt id={id} />
      </RNHostView>
      <Button
        label={t('bounty.post.form.swapArt')}
        systemImage="arrow.triangle.2.circlepath"
        onPress={() => onSwap(nextHandArt(id))}
        testID="bounty-post-swap-art"
        modifiers={[fullRow, ROW_INSETS]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vars['--space-2'],
    minHeight: ART_SIZE + vars['--space-2'] * 2,
  },
});
