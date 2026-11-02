import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

const STICKER = 148;

export function RideEmpty({
  onAdd,
  refreshing,
  onRefresh,
}: {
  onAdd: () => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  return (
    <MomentBackground testID="ride-screen">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        testID="ride-empty"
      >
        <View style={styles.sticker}>
          <HandArt id="car" size={STICKER} />
        </View>
        <View accessible accessibilityRole="header" testID="ride-empty-title">
          <AppText variant="moment-title" style={styles.center}>
            {t('ride.empty.title')}
          </AppText>
        </View>
        <AppText variant="secondary" tone="secondaryLabel" style={styles.center}>
          {t('ride.empty.body')}
        </AppText>
        <View style={styles.action}>
          <PillButton label={t('ride.empty.action')} onPress={onAdd} testID="ride-empty-add" />
        </View>
      </ScrollView>
    </MomentBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: vars['--space-3'],
    paddingHorizontal: vars['--space-7'],
    paddingBottom: vars['--space-7'],
  },
  sticker: { transform: [{ rotate: '-6deg' }], marginBottom: vars['--space-5'] },
  center: { textAlign: 'center' },
  action: { marginTop: vars['--space-3'] },
});
