import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { useI18n } from '@/lib/i18n';
import type { RideDetail } from '@/lib/liveItems';
import { AppText } from '@/ui/AppText';
import { LiveCard, useLiveCardPaint } from '@/ui/LiveCard';
import { CarArt } from '@/ui/StickerArt';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { CardHeader, CardText, Pill } from './cardParts';
import { useStackedBeside } from './useStackedBeside';

const AVATAR = 28;
const CAR = 30;
const STOP_LABEL = 64;

export function RideCard({ detail }: { detail: RideDetail }) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const { ink, surface } = useLiveCardPaint('ride');
  const { stacked, onTextLayout } = useStackedBeside(`${language}|${detail.route}`);
  return (
    <LiveCard tone="ride">
      <CardHeader
        left={<Pill ink={ink}>{t('home.card.ride.tag', { seats: detail.seats })}</Pill>}
        right={
          detail.youBook ? (
            <CardText variant="meta" ink={ink} muted>
              {t('home.card.ride.youBook')}
            </CardText>
          ) : null
        }
      />
      <View style={[styles.main, stacked && styles.mainStacked]}>
        <View style={styles.where}>
          <CardText variant="secondary" ink={ink} muted>
            {t('home.card.ride.departs', { time: detail.departAt })}
          </CardText>
          <CardText variant="title" ink={ink} style={styles.route} onTextLayout={onTextLayout}>
            {detail.route}
          </CardText>
        </View>
        <View
          accessible
          accessibilityLabel={t('home.card.ride.countdownLabel', { time: detail.countdown })}
          style={[styles.countdown, stacked && styles.countdownStacked]}
        >
          <CardText variant="amount" ink={ink}>
            {detail.countdown}
          </CardText>
          <CardText variant="meta" ink={ink} muted>
            {t('home.card.ride.countdownSuffix')}
          </CardText>
        </View>
      </View>
      <RouteLine ink={ink} window={surface} progress={detail.progress} />
      <View style={styles.stops}>
        <Stop label={t('home.card.ride.meet')} value={detail.meet} ink={ink} />
        <Stop label={t('home.card.ride.destination')} value={detail.destination} ink={ink} />
      </View>
      <View style={styles.bottom}>
        <View style={styles.riders} accessible={false}>
          {detail.riders.map((rider, index) => (
            <View
              key={`${rider}-${index}`}
              style={[
                styles.avatar,
                index > 0 && styles.overlap,
                { backgroundColor: color('--color-card-calm'), borderColor: surface },
              ]}
            >
              <AppText variant="meta" style={[styles.initial, { color: ink }]}>
                {rider}
              </AppText>
            </View>
          ))}
        </View>
        <View
          accessible
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={t('home.card.ride.arrive')}
          accessibilityHint={t('home.soon')}
          style={[styles.arrive, { backgroundColor: ink }]}
        >
          <AppText variant="secondary" style={[styles.arriveText, { color: surface }]}>
            {t('home.card.ride.arrive')}
          </AppText>
        </View>
      </View>
    </LiveCard>
  );
}

function Stop({ label, value, ink }: { label: string; value: string; ink: string }) {
  return (
    <View style={styles.stop}>
      <CardText variant="meta" ink={ink} muted style={styles.stopLabel}>
        {label}
      </CardText>
      <CardText variant="meta" ink={ink} muted numberOfLines={2} style={styles.stopValue}>
        {value}
      </CardText>
    </View>
  );
}

function RouteLine({ ink, window, progress }: { ink: string; window: string; progress: number }) {
  const done: `${number}%` = `${Math.round(progress * 100)}%`;
  return (
    <View style={styles.routeLine} importantForAccessibility="no-hide-descendants">
      <Svg style={StyleSheet.absoluteFill} width="100%" height={30}>
        <Line
          x1={8}
          y1={15}
          x2="100%"
          y2={15}
          stroke={ink}
          strokeWidth={2}
          strokeDasharray="6 5"
          opacity={0.3}
        />
      </Svg>
      <View style={[styles.done, { width: done, backgroundColor: ink }]} />
      <View style={[styles.car, { left: done }]}>
        <CarArt width={CAR} body={ink} window={window} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: vars['--space-3'],
    marginTop: vars['--space-3'],
    marginBottom: vars['--space-2'],
  },
  where: { flex: 1, minWidth: 0 },
  route: { fontWeight: '700', marginTop: 2 },
  countdown: { alignItems: 'flex-end' },
  routeLine: { height: 30, marginTop: vars['--space-1'], marginHorizontal: vars['--space-2'] },
  done: { position: 'absolute', left: 0, top: 13, height: 4, borderRadius: 2 },
  car: { position: 'absolute', top: -2, marginLeft: -CAR / 2 },
  mainStacked: { flexDirection: 'column', alignItems: 'stretch' },
  countdownStacked: { alignSelf: 'flex-end' },
  stops: { gap: vars['--space-1'] },
  stop: { flexDirection: 'row', gap: vars['--space-2'] },
  stopLabel: { width: STOP_LABEL, flexShrink: 0 },
  stopValue: { flex: 1, minWidth: 0 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: vars['--space-3'],
  },
  riders: { flexDirection: 'row' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlap: { marginLeft: -vars['--space-2'] },
  initial: { fontWeight: '800' },
  arrive: {
    minHeight: vars['--touch-min'],
    paddingHorizontal: vars['--space-5'],
    borderRadius: vars['--radius-pill'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  arriveText: { fontWeight: '700' },
});
