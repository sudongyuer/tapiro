import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { stickerArt, stickerLabel, type Sticker } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { HandText } from '@/ui/HandText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

export const CARD_HEIGHT = 380;
const ART = 168;

export function cardDate(language: string, iso: string) {
  return new Intl.DateTimeFormat(language, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(iso));
}

export function DoneCard({
  sticker,
  width,
  testID,
}: {
  sticker: Sticker;
  width: number;
  testID: string;
}) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const { line1, title } = stickerLabel(sticker, t);
  const date = cardDate(language, sticker.earnedAt);
  return (
    <View
      accessible
      accessibilityLabel={t('stickers.card.a11y', { date, line1, title })}
      testID={testID}
      style={[styles.card, cardSurface(color), { width }]}
    >
      <HandArt id={stickerArt(sticker)} size={ART} />
      <HandText hand="date" numberOfLines={1} style={{ color: color('--color-on-paper-muted') }}>
        {date}
      </HandText>
      <HandText
        hand="caption"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.center, { color: color('--color-on-paper') }]}
      >
        {line1}
      </HandText>
      <AppText
        variant="secondary"
        numberOfLines={2}
        style={[styles.center, { color: color('--color-on-paper-muted') }]}
      >
        {title}
      </AppText>
    </View>
  );
}

export function cardSurface(color: ReturnType<typeof useTheme>['color']) {
  return {
    backgroundColor: color('--color-receipt'),
    shadowColor: color('--color-sticker-shadow'),
  };
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    alignItems: 'center',
    paddingHorizontal: vars['--space-5'],
    paddingTop: vars['--space-6'],
    paddingBottom: vars['--space-5'],
    gap: vars['--space-1'],
    shadowOffset: { width: 0, height: vars['--sticker-shadow-y'] },
    shadowOpacity: 1,
    shadowRadius: vars['--sticker-shadow-blur'] * 2,
  },
  center: { textAlign: 'center' },
});
