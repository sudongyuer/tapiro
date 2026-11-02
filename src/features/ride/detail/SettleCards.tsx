import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, PlatformColor, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { displayName } from './Avatars';
import { Card } from './DetailCards';
import { myRider, owedDays } from './settleModel';
import type { RideDetail } from './types';

const STICKER = 64;

export function OweCard({
  ride,
  viewerId,
  now,
}: {
  ride: RideDetail;
  viewerId: string;
  now: number;
}) {
  const { t, language } = useI18n();
  const mine = myRider(ride, viewerId);
  const days = owedDays(mine, now);
  if (!mine || days === 0 || ride.status !== 'settling') return null;
  return (
    <Card tone="warning" testID="ride-settle-owe">
      <AppText variant="body" style={styles.bold}>
        {t('rideSettle.owe.title', {
          amount: formatMoney(mine.share, language),
          name: ride.organiser?.name ?? t('bounty.post.unknownName'),
          count: days,
        })}
      </AppText>
      <AppText variant="meta" tone="secondaryLabel">
        {t('rideSettle.owe.body')}
      </AppText>
    </Card>
  );
}

export function StickerCard({
  ride,
  viewerId,
  busy,
  onCollect,
  onOpenBook,
}: {
  ride: RideDetail;
  viewerId: string;
  busy: boolean;
  onCollect: () => void;
  onOpenBook: () => void;
}) {
  const { t } = useI18n();
  if (ride.status !== 'closed' || !ride.sticker) return null;
  const others = (ride.members ?? [])
    .filter((m) => m.status === 'boarded' && m.id !== viewerId)
    .map((m) => displayName(m, viewerId, t));
  const organiser = ride.role === 'organiser';
  const collected = ride.sticker.collected;
  return (
    <Card testID="ride-settle-sticker">
      <View style={styles.sticker}>
        <HandArt id="car" size={STICKER} />
        <View style={styles.flex}>
          <AppText variant="body" style={styles.bold} numberOfLines={2}>
            {t('rideSettle.sticker.title', { place: ride.dest.short })}
          </AppText>
          <AppText variant="meta" tone="secondaryLabel" numberOfLines={3}>
            {ride.splitMode === 'grab'
              ? t('rideSettle.sticker.grab')
              : t('rideSettle.sticker.with', { names: others.join(t('ride.detail.listJoin')) })}
          </AppText>
        </View>
      </View>
      {organiser || collected ? (
        <PillButton
          label={t(organiser ? 'rideSettle.sticker.open' : 'rideSettle.sticker.collected')}
          variant="secondary"
          onPress={onOpenBook}
          testID="ride-settle-open-book"
        />
      ) : (
        <PillButton
          label={t('rideSettle.sticker.collect')}
          loading={busy}
          onPress={onCollect}
          testID="ride-settle-collect"
        />
      )}
    </Card>
  );
}

type Shown = { path: string; uri: string | null; failed: boolean };

export function ReceiptViewer({
  path,
  load,
  onClose,
}: {
  path: string | null;
  load: (path: string) => Promise<string>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    if (!path) return;
    let live = true;
    load(path).then(
      (uri) => live && setShown({ path, uri, failed: false }),
      () => live && setShown({ path, uri: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [path, load]);

  const current = shown?.path === path ? shown : null;
  return (
    <Modal
      visible={path !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.viewer}>
          {current?.uri ? (
            <Image
              source={{ uri: current.uri }}
              style={styles.image}
              contentFit="contain"
              accessible
              accessibilityLabel={t('rideSettle.receipt.label')}
              testID="ride-receipt-image"
            />
          ) : (
            <AppText variant="body" tone="secondaryLabel" testID="ride-receipt-status">
              {current?.failed ? t('rideSettle.receipt.failed') : t('rideSettle.receipt.loading')}
            </AppText>
          )}
        </View>
        <View style={styles.footer}>
          <PillButton
            label={t('rideSettle.receipt.done')}
            onPress={onClose}
            testID="ride-receipt-close"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '600' },
  flex: { flex: 1, minWidth: 0, gap: vars['--space-1'] },
  sticker: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  screen: { flex: 1, backgroundColor: PlatformColor('systemBackground') },
  viewer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: vars['--space-5'] },
  image: { width: '100%', height: '100%' },
  footer: { paddingHorizontal: vars['--space-5'], paddingBottom: vars['--space-4'] },
});
