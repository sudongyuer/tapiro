import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

import { RideTicket } from '../RideTicket';
import type { TicketView } from '../ticketView';

// The ticket sits above the Form, not in a Form row: it stays in view while the Form scrolls (RideCreate1
// 「往下滑到底」), and an RN view in a Form row was measured at its unwrapped width (TaskCard).
export function TicketFrame({
  view,
  caption = true,
  testID,
  children,
}: {
  view: TicketView;
  caption?: boolean;
  testID: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const headerHeight = useHeaderHeight();
  return (
    <View style={[styles.screen, { paddingTop: headerHeight }]}>
      <View style={styles.ticket}>
        <RideTicket view={view} fixed testID={`${testID}-ticket`} />
        {caption ? (
          <AppText variant="meta" tone="secondaryLabel" style={styles.caption}>
            {t('ride.create.form.caption')}
          </AppText>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  ticket: {
    paddingHorizontal: vars['--space-4'],
    paddingTop: vars['--space-2'],
    gap: vars['--space-1'],
  },
  caption: { paddingHorizontal: vars['--space-4'] },
  body: { flex: 1 },
});
