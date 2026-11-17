import { SymbolView } from 'expo-symbols';
import { createContext, useContext, type ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { PressDim } from '@/ui/PressDim';
import { typeStyle, vars } from '@/ui/theme/tokens';
import { useSelectedUntilReturn } from '@/ui/useSelectedUntilReturn';

import type { RideDetail } from './types';

const CHEVRON = 12;

const OpenProfile = createContext<((personId: string) => void) | null>(null);

export const ProfileLinkProvider = OpenProfile.Provider;

export function ProfileLink({
  personId,
  name,
  label,
  lineHeight,
  testID,
  children,
}: {
  personId: string;
  name: string;
  label: string;
  lineHeight?: number;
  testID?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const open = useContext(OpenProfile);
  const { select, highlight } = useSelectedUntilReturn();
  const overhang = lineHeight ? (vars['--touch-min'] - lineHeight) / 2 : 0;
  if (!open) {
    return (
      <View accessible accessibilityLabel={label} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <PressDim
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('reputation.profile.open', { name })}
      testID={testID}
      onPress={() => {
        select();
        open(personId);
      }}
      style={[styles.link, { paddingVertical: overhang, marginVertical: -overhang }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.selected, { marginVertical: overhang }, highlight]}
      />
      <View style={styles.content}>{children}</View>
      <SymbolView
        name="chevron.right"
        size={CHEVRON}
        weight="semibold"
        tintColor={PlatformColor('tertiaryLabel')}
      />
    </PressDim>
  );
}

export function OrganiserLink({
  ride,
  viewerId,
  name,
  children,
}: {
  ride: RideDetail;
  viewerId: string;
  name: string;
  children: (label: string) => ReactNode;
}) {
  const { t } = useI18n();
  const organiser = ride.organiser;
  const tier = organiser ? t(`bounty.tier.${organiser.tier}`) : '';
  const label = t('ride.detail.steps.by', { name, tier });
  if (!organiser || organiser.id === viewerId) {
    return (
      <View accessible accessibilityLabel={label} testID="ride-detail-organiser">
        {children(label)}
      </View>
    );
  }
  return (
    <ProfileLink
      personId={organiser.id}
      name={name}
      label={label}
      lineHeight={typeStyle('meta').lineHeight}
      testID="ride-detail-organiser"
    >
      {children(label)}
    </ProfileLink>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: vars['--touch-min'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-2'],
  },
  selected: {
    ...StyleSheet.absoluteFill,
    marginHorizontal: -vars['--space-2'],
    borderRadius: vars['--radius-chip'],
    backgroundColor: PlatformColor('systemGray4'),
  },
  content: { flex: 1, minWidth: 0 },
});
