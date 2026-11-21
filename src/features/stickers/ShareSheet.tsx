import * as Haptics from 'expo-haptics';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
  StyleSheet,
  View,
  type ViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { stickerArt, useStickers, type Sticker } from '@/lib/stickers';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { ShareTarget } from './shareTarget';
import { nextBackground, posterCard, posterMonth, type PosterBackground } from './posterData';
import { CardPoster, MonthPoster, POSTER_RATIO } from './Poster';
import { posterDevice } from './services';

type Phase = 'idle' | 'saving' | 'saved' | 'sharing' | 'failed' | 'denied' | 'shareFailed';

const ROUND = vars['--touch-min'];
const POSTER_MAX = 360;

export function ShareSheet({ userId, target }: { userId: string; target: ShareTarget }) {
  const { t } = useI18n();
  const view = useStickers(userId);
  if (view.status === 'loading')
    return <ActivityIndicator style={styles.fill} accessibilityLabel={t('stickers.loading')} />;
  if (view.status === 'failed')
    return (
      <View style={[styles.fill, styles.state]} testID="sticker-share-failed">
        <AppText variant="secondary" tone="secondaryLabel">
          {t('stickers.loadFailed.title')}
        </AppText>
        <PillButton label={t('stickers.retry')} variant="secondary" onPress={view.retry} />
      </View>
    );
  return <Share stickers={view.stickers} target={target} />;
}

function Share({ stickers, target }: { stickers: Sticker[]; target: ShareTarget }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const poster = useRef<ViewInstance>(null);
  const [background, setBackground] = useState<PosterBackground>('paper');
  const [phase, setPhase] = useState<Phase>('idle');
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const arts = stickers.map(stickerArt);
  const card = 'card' in target ? stickers.find((sticker) => sticker.id === target.card) : null;
  const width = area
    ? Math.min(area.width - vars['--space-5'] * 2, area.height / POSTER_RATIO, POSTER_MAX)
    : 0;
  const busy = phase === 'saving' || phase === 'sharing';

  const run = async (kind: 'save' | 'share') => {
    const tag = findNodeHandle(poster.current);
    if (tag == null || busy) return;
    setPhase(kind === 'save' ? 'saving' : 'sharing');
    if (kind === 'save') {
      const outcome = await posterDevice.save(tag);
      if (outcome === 'saved')
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase(outcome === 'saved' ? 'saved' : outcome);
      return;
    }
    const outcome = await posterDevice.share(tag);
    setPhase(outcome === 'failed' ? 'shareFailed' : 'idle');
  };

  const error =
    phase === 'failed'
      ? t('stickers.share.failed')
      : phase === 'denied'
        ? t('stickers.share.denied')
        : phase === 'shareFailed'
          ? t('stickers.share.shareFailed')
          : null;

  return (
    <View
      style={[
        styles.fill,
        { paddingTop: headerHeight, paddingBottom: insets.bottom + vars['--space-3'] },
      ]}
    >
      <View
        style={styles.area}
        onLayout={({ nativeEvent }) => setArea(nativeEvent.layout)}
        testID="sticker-share"
      >
        {width > 0 ? (
          <View>
            {card ? (
              <CardPoster
                data={posterCard(card)}
                arts={arts}
                background={background}
                width={width}
                posterRef={poster}
              />
            ) : 'month' in target ? (
              <MonthPoster
                data={posterMonth(stickers, target.month)}
                arts={arts}
                background={background}
                width={width}
                posterRef={poster}
              />
            ) : null}
            <PressDim
              style={[
                styles.round,
                {
                  backgroundColor: color('--color-receipt'),
                  shadowColor: color('--color-sticker-shadow'),
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('stickers.share.background')}
              accessibilityValue={{ text: t(`stickers.share.backgrounds.${background}`) }}
              onPress={() => {
                setBackground(nextBackground(background));
                if (!busy) setPhase('idle');
              }}
              testID="sticker-share-background"
            >
              <SymbolView
                name="paintpalette"
                size={vars['--text-body']}
                tintColor={color('--color-on-paper')}
              />
            </PressDim>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <View style={styles.row}>
          <View style={styles.grow}>
            <PillButton
              label={t(phase === 'saved' ? 'stickers.share.saved' : 'stickers.share.save')}
              symbol={phase === 'saved' ? 'checkmark' : 'square.and.arrow.down'}
              variant="secondary"
              loading={phase === 'saving'}
              loadingLabel={t('stickers.share.saving')}
              disabled={phase === 'saved' || phase === 'sharing'}
              onPress={() => void run('save')}
              testID="sticker-share-save"
            />
          </View>
          <View style={styles.grow}>
            <PillButton
              label={t('stickers.share.share')}
              symbol="square.and.arrow.up"
              loading={phase === 'sharing'}
              disabled={phase === 'saving'}
              onPress={() => void run('share')}
              testID="sticker-share-share"
            />
          </View>
        </View>
        {error ? (
          <AppText
            variant="meta"
            style={[styles.center, { color: color('--color-urgent') }]}
            accessibilityRole="alert"
            testID="sticker-share-error"
          >
            {error}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  state: { justifyContent: 'center', alignItems: 'center', gap: vars['--space-3'] },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  round: {
    position: 'absolute',
    top: vars['--space-3'],
    right: vars['--space-3'],
    width: ROUND,
    height: ROUND,
    borderRadius: ROUND / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: vars['--sticker-shadow-blur'],
  },
  actions: { paddingHorizontal: vars['--space-5'], gap: vars['--space-2'] },
  row: { flexDirection: 'row', gap: vars['--space-3'] },
  grow: { flex: 1 },
  center: { textAlign: 'center' },
});
