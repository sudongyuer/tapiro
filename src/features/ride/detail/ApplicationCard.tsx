import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { nameInitial } from '@/lib/nameInitial';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { ProfileLink } from './ProfileLink';
import type { RideRequest } from './types';

const FACE = 36;
const ICON = 15;

export function ApplicationCard({
  requests,
  busy,
  full,
  onDecide,
}: {
  requests: RideRequest[];
  busy: string | null;
  full: boolean;
  onDecide: (member: string, approve: boolean) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  if (requests.length === 0) return null;
  return (
    <View style={styles.card} testID="ride-detail-requests">
      <View style={styles.head}>
        <SymbolView
          name="exclamationmark.circle.fill"
          size={ICON}
          tintColor={color('--color-warning')}
        />
        <AppText variant="body" style={[styles.title, { color: color('--color-warning') }]}>
          {t('ride.detail.requests.title', { count: requests.length })}
        </AppText>
        <AppText variant="meta" tone="secondaryLabel" style={styles.hint}>
          {full ? t('ride.detail.requests.full') : t('ride.detail.requests.hint')}
        </AppText>
      </View>
      {requests.map((request) => {
        const name = request.name ?? t('bounty.post.unknownName');
        const tier = t(`bounty.tier.${request.tier}`);
        const working = busy === request.id;
        return (
          <View
            key={request.id}
            style={styles.request}
            testID={`ride-detail-request-${request.id}`}
          >
            <View style={[styles.face, { backgroundColor: color('--color-card-calm') }]}>
              <AppText
                variant="secondary"
                style={[styles.letter, { color: color('--color-on-card-calm') }]}
              >
                {nameInitial(name)}
              </AppText>
            </View>
            <View style={styles.text}>
              <ProfileLink
                personId={request.id}
                name={name}
                testID={`ride-detail-request-name-${request.id}`}
                label={
                  request.note
                    ? t('ride.detail.requests.a11y', { name, tier, note: request.note })
                    : t('ride.detail.requests.a11yNoNote', { name, tier })
                }
              >
                <View style={styles.nameRow}>
                  <AppText variant="body" numberOfLines={1} style={[styles.name]}>
                    {name}
                  </AppText>
                  <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
                    {tier}
                  </AppText>
                </View>
              </ProfileLink>
              {request.note ? (
                <AppText variant="secondary" testID={`ride-detail-request-note-${request.id}`}>
                  {t('ride.detail.requests.note', { note: request.note })}
                </AppText>
              ) : null}
              <View style={styles.actions}>
                <PillButton
                  label={t('ride.detail.requests.decline')}
                  variant="secondary"
                  disabled={busy !== null}
                  loading={working}
                  onPress={() => onDecide(request.id, false)}
                  testID={`ride-detail-decline-${request.id}`}
                />
                <PillButton
                  label={t('ride.detail.requests.approve')}
                  disabled={busy !== null || full}
                  loading={working}
                  onPress={() => onDecide(request.id, true)}
                  testID={`ride-detail-approve-${request.id}`}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    padding: vars['--space-4'],
    gap: vars['--space-3'],
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-1'], flexWrap: 'wrap' },
  title: { fontWeight: '700' },
  hint: { marginLeft: vars['--space-1'] },
  request: { flexDirection: 'row', gap: vars['--space-3'] },
  face: {
    width: FACE,
    height: FACE,
    borderRadius: FACE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontWeight: '700' },
  text: { flex: 1, minWidth: 0, gap: vars['--space-1'] },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: vars['--space-2'] },
  name: { fontWeight: '700', flexShrink: 1 },
  actions: { flexDirection: 'row', gap: vars['--space-2'], paddingTop: vars['--space-1'] },
});
