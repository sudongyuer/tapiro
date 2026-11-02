import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { PressDim } from '@/ui/PressDim';
import { MUTED_TEXT_OPACITY, token, typeStyle, vars } from '@/ui/theme/tokens';

import type { TicketView } from './ticketView';

const STUB_WIDTH = 96;
const NOTCH = 14;
const STICKER = 34;
const ICON = 13;
const MIN_ROUTE_SCALE = 0.55;

const ink = token('--color-on-card-ride') as string;
const TONE_INK = {
  urgent: token('--color-urgent') as string,
  warning: token('--color-warning') as string,
  plain: ink,
};

export function RideTicket({
  view,
  onPress,
  fixed = false,
  overlay,
  testID,
}: {
  view: TicketView;
  onPress?: () => void;
  fixed?: boolean;
  overlay?: ReactNode;
  testID: string;
}) {
  const surface = token(view.muted ? '--color-card-calm' : '--color-ride') as string;
  const toneInk = TONE_INK[view.tone];
  const showAirport = view.flight !== null || view.bags !== null;
  const showLabels = view.labels !== null && !(fixed && showAirport);
  const body = (
    <>
      <View style={styles.main}>
        <View style={styles.statusRow}>
          <SymbolView name={view.icon} size={ICON} tintColor={toneInk} />
          <AppText variant="meta" numberOfLines={1} style={[styles.status, { color: toneInk }]}>
            {view.status}
            {view.time ? (
              <AppText variant="meta" style={styles.dot}>
                {'  ·  '}
              </AppText>
            ) : null}
            {view.time ? (
              <AppText variant="meta" style={styles.time}>
                {view.time}
              </AppText>
            ) : null}
          </AppText>
        </View>
        <AppText
          variant="reward"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={MIN_ROUTE_SCALE}
          style={[styles.route, view.placeholder && styles.faint]}
        >
          {view.route}
        </AppText>
        <View style={fixed ? styles.fixedDetail : undefined}>
          {showLabels ? (
            <AppText variant="meta" numberOfLines={2} style={styles.labels}>
              {view.labels}
            </AppText>
          ) : null}
          {showAirport ? <AirportLine flight={view.flight} bags={view.bags} /> : null}
        </View>
      </View>
      <View style={styles.tear}>
        <View style={[styles.notch, styles.notchTop]} />
        <View style={styles.dash} />
        <View style={[styles.notch, styles.notchBottom]} />
      </View>
      <View style={styles.stub}>
        <View style={styles.sticker}>
          <HandArt id="car" size={STICKER} />
        </View>
        <AppText
          variant="reward"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={MIN_ROUTE_SCALE}
          style={[styles.amount, view.placeholder && styles.faint]}
        >
          {view.amount}
        </AppText>
        <AppText variant="meta" numberOfLines={1} style={styles.fare}>
          {view.fare}
        </AppText>
      </View>
      {overlay}
    </>
  );
  const style = [styles.ticket, { backgroundColor: surface }];
  if (!onPress) {
    return (
      <View style={style} accessible accessibilityLabel={view.a11y} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <PressDim
      style={style}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={view.a11y}
      testID={testID}
    >
      {body}
    </PressDim>
  );
}

function AirportLine({ flight, bags }: { flight: string | null; bags: string | null }) {
  return (
    <View style={styles.airport}>
      {flight ? (
        <View style={styles.airportPart}>
          <SymbolView name="airplane" size={ICON} tintColor={ink} />
          <AppText variant="meta" numberOfLines={1} style={styles.airportText}>
            {flight}
          </AppText>
        </View>
      ) : null}
      {flight && bags ? (
        <AppText variant="meta" style={styles.dot}>
          ·
        </AppText>
      ) : null}
      {bags ? (
        <View style={styles.airportPart}>
          <SymbolView name="suitcase.rolling" size={ICON} tintColor={ink} />
          <AppText variant="meta" numberOfLines={1} style={styles.airportText}>
            {bags}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const metaLine = typeStyle('meta').lineHeight;

const styles = StyleSheet.create({
  ticket: {
    flexDirection: 'row',
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    paddingVertical: vars['--space-3'],
    paddingLeft: vars['--space-4'],
    paddingRight: vars['--space-3'],
    gap: vars['--space-1'] / 2,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-1'] },
  status: { flexShrink: 1, fontWeight: '700' },
  dot: { color: ink, opacity: MUTED_TEXT_OPACITY },
  time: { color: ink, fontWeight: '700' },
  route: { color: ink },
  labels: { color: ink, opacity: MUTED_TEXT_OPACITY },
  faint: { opacity: 0.4 },
  fixedDetail: { minHeight: metaLine * 2 },
  airport: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: vars['--space-1'] },
  airportPart: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-1'] },
  airportText: { color: ink, fontWeight: '600' },
  tear: { width: NOTCH, alignItems: 'center' },
  dash: {
    flex: 1,
    width: 1,
    marginVertical: vars['--space-2'],
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
  notchTop: { top: -NOTCH / 2 },
  notchBottom: { bottom: -NOTCH / 2 },
  stub: {
    width: STUB_WIDTH,
    paddingVertical: vars['--space-3'],
    paddingRight: vars['--space-2'],
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sticker: { transform: [{ rotate: '6deg' }], marginBottom: vars['--space-1'] },
  amount: { color: ink },
  fare: { color: ink, opacity: MUTED_TEXT_OPACITY, fontWeight: '600' },
});
