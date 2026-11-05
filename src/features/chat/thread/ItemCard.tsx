import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { HandArt, HandArtSticker } from '@/ui/HandArt';
import { PressDim } from '@/ui/PressDim';
import { space, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { ThreadInfo } from '../types';
import { itemCardView } from './threadView';

const ART = 30;

export function ItemCard({
  info,
  now,
  onOpen,
}: {
  info: ThreadInfo;
  now: number;
  onOpen: (info: ThreadInfo) => void;
}) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const view = itemCardView(info.item, now, t, language);
  return (
    <PressDim
      accessibilityRole="button"
      accessibilityLabel={view.a11y}
      testID="chat-item-card"
      style={styles.row}
      onPress={() => onOpen(info)}
    >
      <View style={styles.art}>
        {view.art.kind === 'bounty' ? (
          <HandArtSticker source={view.art.source} size={ART} />
        ) : (
          <HandArt id={view.art.id} size={ART} />
        )}
      </View>
      <View style={styles.text}>
        <AppText variant="secondary" style={styles.title} numberOfLines={1}>
          {view.title}
        </AppText>
        <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
          {view.status}
        </AppText>
      </View>
      <AppText variant="secondary" style={[styles.open, { color: color('--color-accent') }]}>
        {t('chat.item.open')}
      </AppText>
    </PressDim>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: space.md,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemBackground'),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: vars['--touch-min'],
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  art: { width: ART, height: ART, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
  open: { fontWeight: '600', flexShrink: 0 },
});
