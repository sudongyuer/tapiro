import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

const STICKER = 148;

type Props = {
  onAdd: () => void;
  refreshing: boolean;
  onRefresh: () => void;
};

export function RideEmpty(props: Props) {
  return (
    <MomentBackground>
      {/* A nested provider reads this screen's own safe area, which includes the large title and the tab bar. */}
      <SafeAreaProvider style={styles.fill}>
        <RideEmptyBody {...props} />
      </SafeAreaProvider>
    </MomentBackground>
  );
}

function RideEmptyBody({ onAdd, refreshing, onRefresh }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [frame, setFrame] = useState(0);
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        { minHeight: Math.max(0, frame - insets.top - insets.bottom) },
      ]}
      onLayout={(event) => setFrame(event.nativeEvent.layout.height)}
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
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: vars['--space-3'],
    paddingHorizontal: vars['--space-7'],
  },
  sticker: { transform: [{ rotate: '-6deg' }], marginBottom: vars['--space-5'] },
  center: { textAlign: 'center' },
  action: { marginTop: vars['--space-3'] },
});
