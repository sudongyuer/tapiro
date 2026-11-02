import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { PlatformColor, ScrollView, StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { token, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { malaysiaClock, malaysiaDayKey } from '../rideClock';
import { recentRoutes, rideDraftStore } from '../services';
import { useNow } from '../useNow';
import { dayText } from '../ticketView';
import { RIDE_TILES, type RideDraft, type RideTile } from './draft';
import type { RecentRoute } from './recentRoutes';
import { rideFormError } from './useRideDraft';

const TILE_ICONS: Record<RideTile, SFSymbol> = {
  home: 'house',
  campus: 'graduationcap',
  mall: 'bag',
  airport: 'airplane',
};
const BADGE = 44;

export function RidePick({
  userId,
  onPicked,
  onClose,
}: {
  userId: string;
  onPicked: () => void;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const [recent] = useState(() => recentRoutes.list(userId));
  const now = useNow();

  function start(patch: Partial<RideDraft>) {
    if (Object.keys(patch).length > 0) rideDraftStore.update(userId, patch);
    rideFormError.set(null);
    onPicked();
  }

  const pickRoute = (route: RecentRoute) =>
    start({ start: route.start, dest: route.dest, seats: route.seats });

  const pickTile = (tile: RideTile) =>
    start({ tile, airportOpen: tile === 'airport' || rideDraftStore.load(userId).airportOpen });

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={onClose}>{t('ride.create.cancel')}</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        testID="ride-pick"
      >
        <AppText variant="secondary" tone="secondaryLabel">
          {t('ride.create.pick.subtitle')}
        </AppText>
        {recent.length > 0 ? (
          <View style={styles.group}>
            <AppText variant="secondary" style={styles.groupTitle}>
              {t('ride.create.pick.recent')}
            </AppText>
            <View style={styles.card}>
              {recent.map((route, index) => {
                const title = t('ride.ticket.route', {
                  from: route.start.short,
                  to: route.dest.short,
                });
                const at = Date.parse(route.at);
                const meta = t('ride.create.pick.recentMeta', {
                  date: `${dayText(malaysiaDayKey(at), now, t, language)} ${malaysiaClock(at)}`,
                  count: route.seats,
                });
                return (
                  <PressDim
                    key={`${route.start.label}-${route.dest.label}`}
                    style={[styles.recent, index > 0 && styles.divided]}
                    onPress={() => pickRoute(route)}
                    accessibilityRole="button"
                    accessibilityLabel={`${title}, ${meta}`}
                    testID={`ride-pick-recent-${index}`}
                  >
                    <SymbolView
                      name="clock"
                      size={20}
                      tintColor={PlatformColor('secondaryLabel')}
                    />
                    <View style={styles.recentText}>
                      <AppText variant="body" style={styles.bold} numberOfLines={1}>
                        {title}
                      </AppText>
                      <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
                        {meta}
                      </AppText>
                    </View>
                    <SymbolView
                      name="chevron.right"
                      size={14}
                      tintColor={PlatformColor('tertiaryLabel')}
                    />
                  </PressDim>
                );
              })}
            </View>
          </View>
        ) : null}
        <View style={styles.grid}>
          {RIDE_TILES.map((tile) => {
            const name = t(`ride.create.pick.tile.${tile}.name`);
            const hint = t(`ride.create.pick.tile.${tile}.hint`);
            return (
              <PressDim
                key={tile}
                style={styles.tile}
                onPress={() => pickTile(tile)}
                accessibilityRole="button"
                accessibilityLabel={t('ride.create.pick.tileLabel', { name, hint })}
                testID={`ride-pick-${tile}`}
              >
                <View style={[styles.badge, { backgroundColor: token('--color-ride') as string }]}>
                  <SymbolView
                    name={TILE_ICONS[tile]}
                    size={22}
                    tintColor={token('--color-on-card-ride') as string}
                  />
                </View>
                <AppText variant="body" style={styles.bold} numberOfLines={2}>
                  {name}
                </AppText>
                <AppText variant="meta" tone="secondaryLabel" numberOfLines={2}>
                  {hint}
                </AppText>
              </PressDim>
            );
          })}
        </View>
        <PressDim
          style={styles.free}
          onPress={() => start({})}
          accessibilityRole="button"
          testID="ride-pick-free"
        >
          <AppText variant="body" style={[styles.bold, { color: color('--color-accent') }]}>
            {t('ride.create.pick.free')}
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
  group: { gap: vars['--space-2'] },
  groupTitle: { fontWeight: '600', paddingHorizontal: vars['--space-1'] },
  card: {
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    minHeight: vars['--touch-min'],
    paddingVertical: vars['--space-3'],
    paddingHorizontal: vars['--space-4'],
  },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: PlatformColor('separator') },
  recentText: { flex: 1 },
  bold: { fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-3'] },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: vars['--space-1'],
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vars['--space-2'],
  },
  free: { minHeight: vars['--touch-min'], alignItems: 'center', justifyContent: 'center' },
});
