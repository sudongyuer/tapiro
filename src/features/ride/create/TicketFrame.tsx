import { RNHostView } from '@expo/ui/swift-ui';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

import { RideTicket } from '../RideTicket';
import type { TicketView } from '../ticketView';

export function TicketScreen({ children }: { children: ReactNode }) {
  const headerHeight = useHeaderHeight();
  return <View style={[styles.screen, { paddingTop: headerHeight }]}>{children}</View>;
}

// The ticket stays pinned above the Form in its top safe-area bar (RideCreate1 「往下滑到底」); an RN view in a
// Form row was measured at its unwrapped width (TaskCard).
export function TicketBar({
  view,
  caption = true,
  testID,
}: {
  view: TicketView;
  caption?: boolean;
  testID: string;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.ticket}>
      <RideTicket view={view} fixed testID={`${testID}-ticket`} />
      {caption ? (
        <AppText variant="meta" tone="secondaryLabel" style={styles.caption}>
          {t('ride.create.form.caption')}
        </AppText>
      ) : null}
    </View>
  );
}

export function TicketBarHost(props: Parameters<typeof TicketBar>[0]) {
  return (
    <RNHostView matchContents={{ vertical: true }}>
      <TicketBar {...props} />
    </RNHostView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  ticket: {
    paddingHorizontal: vars['--space-4'],
    paddingTop: vars['--space-2'],
    paddingBottom: vars['--space-2'],
    gap: vars['--space-1'],
  },
  caption: { paddingHorizontal: vars['--space-4'] },
});
