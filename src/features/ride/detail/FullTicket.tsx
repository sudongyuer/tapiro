import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { MUTED_TEXT_OPACITY, token, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { FullTicketView, TicketCell } from './fullTicketView';
import { useStampLanding } from './useStampLanding';

const NOTCH = 14;
const STICKER = 52;
const ICON = 13;
const STAMP_TILT = -8;
const MIN_ROUTE_SCALE = 0.5;

const ink = token('--color-on-card-ride') as string;
const TONE_INK = {
  urgent: token('--color-urgent') as string,
  warning: token('--color-warning') as string,
  plain: ink,
};

export function FullTicket({
  view,
  stamp,
  onLayout,
}: {
  view: FullTicketView;
  stamp: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { t } = useI18n();
  const surface = token(view.muted ? '--color-card-calm' : '--color-ride') as string;
  const toneInk = TONE_INK[view.tone];
  return (
    <View
      style={[styles.ticket, { backgroundColor: surface }]}
      accessible
      accessibilityLabel={stamp ? `${t('ride.detail.applied.stamp')}, ${view.a11y}` : view.a11y}
      testID="ride-detail-ticket"
    >
      <View style={styles.head}>
        <View style={styles.sticker}>
          <HandArt id="car" size={STICKER} />
        </View>
        <View style={styles.statusRow}>
          <SymbolView name={view.icon} size={ICON} tintColor={toneInk} />
          <AppText variant="meta" numberOfLines={1} style={[styles.status, { color: toneInk }]}>
            {view.status}
            {view.time ? (
              <AppText variant="meta" style={styles.dot}>
                {'  ·  '}
              </AppText>
            ) : null}
            {view.oldTime ? (
              <AppText variant="meta" style={[styles.time, styles.struck]}>
                {`${view.oldTime} `}
              </AppText>
            ) : null}
            {view.time ? (
              <AppText variant="meta" style={styles.time}>
                {view.time}
              </AppText>
            ) : null}
          </AppText>
        </View>
        {view.countdown ? (
          <View style={styles.countdown}>
            <AppText variant="amount-compact" style={styles.ink}>
              {view.countdown.number}
            </AppText>
            <AppText variant="title" style={[styles.ink, styles.countdownText]} numberOfLines={1}>
              {view.countdown.text}
            </AppText>
          </View>
        ) : null}
        <AppText
          variant={view.countdown ? 'title' : 'moment-title'}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={MIN_ROUTE_SCALE}
          style={[styles.ink, styles.route]}
          onLayout={onLayout}
        >
          {view.route}
        </AppText>
        {view.labels ? (
          <AppText variant="meta" numberOfLines={2} style={[styles.ink, styles.muted]}>
            {view.labels}
          </AppText>
        ) : null}
        <AppliedStamp shown={stamp} />
      </View>
      <Tear />
      <CellRow cells={view.cells} />
      {view.airport.length > 0 ? (
        <>
          <View style={styles.rule} />
          <CellRow cells={view.airport} />
        </>
      ) : null}
    </View>
  );
}

function AppliedStamp({ shown }: { shown: boolean }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const landing = useStampLanding(shown, STAMP_TILT);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.stamp,
        { borderColor: color('--color-success'), backgroundColor: color('--color-receipt') },
        landing,
      ]}
      testID="ride-detail-stamp"
    >
      <AppText variant="secondary" style={[styles.stampText, { color: color('--color-success') }]}>
        {t('ride.detail.applied.stamp')}
      </AppText>
    </Animated.View>
  );
}

function Tear() {
  return (
    <View style={styles.tear}>
      <View style={[styles.notch, styles.notchLeft]} />
      <View style={styles.dash} />
      <View style={[styles.notch, styles.notchRight]} />
    </View>
  );
}

function CellRow({ cells }: { cells: TicketCell[] }) {
  return (
    <View style={styles.cells}>
      {cells.map((item) => (
        <View key={item.key} style={styles.cell} testID={`ride-detail-cell-${item.key}`}>
          <AppText variant="meta" numberOfLines={1} style={[styles.ink, styles.muted]}>
            {item.label}
          </AppText>
          <AppText
            variant="body"
            numberOfLines={1}
            style={[styles.ink, styles.value, item.faint && styles.faint]}
          >
            {item.value}
          </AppText>
          {item.sub ? (
            <AppText variant="meta" numberOfLines={1} style={[styles.ink, styles.muted]}>
              {item.sub}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { borderRadius: vars['--radius-card'], borderCurve: 'continuous', overflow: 'hidden' },
  head: {
    paddingTop: vars['--space-3'],
    paddingHorizontal: vars['--space-4'],
    paddingBottom: vars['--space-3'],
    gap: vars['--space-1'],
  },
  sticker: {
    position: 'absolute',
    top: vars['--space-2'],
    right: vars['--space-3'],
    transform: [{ rotate: '6deg' }],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-1'],
    paddingRight: STICKER,
  },
  status: { flexShrink: 1, fontWeight: '700' },
  dot: { color: ink, opacity: MUTED_TEXT_OPACITY },
  time: { color: ink, fontWeight: '700' },
  struck: { textDecorationLine: 'line-through', opacity: MUTED_TEXT_OPACITY },
  countdown: { flexDirection: 'row', alignItems: 'baseline', gap: vars['--space-1'] },
  countdownText: { flexShrink: 1, fontWeight: '700' },
  route: { paddingRight: STICKER },
  ink: { color: ink },
  muted: { opacity: MUTED_TEXT_OPACITY },
  faint: { opacity: 0.55, fontWeight: '400' },
  value: { fontWeight: '700' },
  stamp: {
    position: 'absolute',
    right: vars['--space-4'],
    bottom: -vars['--space-1'],
    borderWidth: vars['--sticker-border-small'],
    borderRadius: vars['--space-2'],
    borderCurve: 'continuous',
    paddingHorizontal: vars['--space-2'],
  },
  stampText: { fontWeight: '800' },
  tear: { height: NOTCH, justifyContent: 'center' },
  dash: {
    marginHorizontal: vars['--space-4'],
    height: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: ink,
    opacity: 0.35,
  },
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: PlatformColor('systemGroupedBackground'),
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  cells: {
    flexDirection: 'row',
    paddingHorizontal: vars['--space-4'],
    paddingVertical: vars['--space-2'],
    gap: vars['--space-3'],
  },
  cell: { flex: 1, minWidth: 0 },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: vars['--space-4'],
    backgroundColor: ink,
    opacity: 0.2,
  },
});
