import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

const MASCOT = 148;

type Props = { onBrowse: () => void; refreshing: boolean; onRefresh: () => void };

export function ChatEmpty(props: Props) {
  return (
    <MomentBackground>
      {/* A nested provider reads this screen's own safe area, which includes the large title and the tab bar. */}
      <SafeAreaProvider style={styles.fill}>
        <ChatEmptyBody {...props} />
      </SafeAreaProvider>
    </MomentBackground>
  );
}

function ChatEmptyBody({ onBrowse, refreshing, onRefresh }: Props) {
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
      testID="chat-empty"
    >
      <View style={styles.mascot}>
        <Mascot variant="front" size={MASCOT} outlined />
      </View>
      <View accessible accessibilityRole="header" testID="chat-empty-title">
        <AppText variant="moment-title" style={styles.center}>
          {t('chat.list.emptyTitle')}
        </AppText>
      </View>
      <AppText variant="secondary" tone="secondaryLabel" style={styles.center}>
        {t('chat.list.emptyBody')}
      </AppText>
      <View style={styles.action}>
        <PillButton
          label={t('chat.list.emptyAction')}
          variant="secondary"
          onPress={onBrowse}
          testID="chat-empty-browse"
        />
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
  mascot: { marginBottom: vars['--space-5'] },
  center: { textAlign: 'center' },
  action: { marginTop: vars['--space-3'] },
});
