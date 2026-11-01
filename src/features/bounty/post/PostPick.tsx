import { Stack, useIsFocused } from 'expo-router';
import { PlatformColor, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { BountyCategory } from '@/lib/stickers/category';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { POST_KINDS } from './postKinds';
import { draftStore } from './services';
import { pickPatch } from './titleEdit';
import { useHintFocus } from './useStartPost';

const TILE_ART = 76;

type PickProps = {
  userId: string;
  onPicked: () => void;
  onClose: () => void;
};

export function PostPick({ userId, onPicked, onClose }: PickProps) {
  const { t } = useI18n();
  const { color } = useTheme();
  useHintFocus(useIsFocused());

  function pick(category: BountyCategory) {
    draftStore.update(userId, pickPatch(category, draftStore.load(userId).title));
    onPicked();
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={onClose}>{t('bounty.post.cancel')}</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        testID="bounty-post-pick"
      >
        <AppText variant="secondary" tone="secondaryLabel">
          {t('bounty.post.pick.subtitle')}
        </AppText>
        <View style={styles.grid}>
          {POST_KINDS.map((kind) => {
            const name = t(`bounty.post.kind.${kind.category}.tile`);
            const hint = t(`bounty.post.kind.${kind.category}.hint`);
            return (
              <PressDim
                key={kind.category}
                style={styles.tile}
                onPress={() => pick(kind.category)}
                accessibilityRole="button"
                accessibilityLabel={t('bounty.post.pick.tileLabel', { name, hint })}
                testID={`bounty-post-pick-${kind.category}`}
              >
                <HandArt id={kind.art} size={TILE_ART} />
                <AppText variant="body" style={styles.name} numberOfLines={2}>
                  {name}
                </AppText>
                <AppText variant="meta" tone="secondaryLabel" style={styles.hint} numberOfLines={2}>
                  {hint}
                </AppText>
              </PressDim>
            );
          })}
        </View>
        <PressDim
          style={styles.free}
          onPress={onPicked}
          accessibilityRole="button"
          testID="bounty-post-pick-free"
        >
          <AppText variant="body" style={[styles.freeText, { color: color('--color-accent') }]}>
            {t('bounty.post.pick.free')}
          </AppText>
        </PressDim>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: {
    paddingHorizontal: vars['--space-4'],
    paddingBottom: vars['--space-7'],
    gap: vars['--space-4'],
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-3'] },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: vars['--space-1'],
    paddingVertical: vars['--space-3'],
    paddingHorizontal: vars['--space-3'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  name: { fontWeight: '600', textAlign: 'center' },
  hint: { textAlign: 'center' },
  free: {
    minHeight: vars['--touch-min'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeText: { fontWeight: '600' },
});
