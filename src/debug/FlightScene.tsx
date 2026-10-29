import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { findNodeHandle, ScrollView, StyleSheet, View } from 'react-native';
import { StickerFlight } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { CategorySticker } from '@/ui/CategorySticker';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

const ME_TAB_ID = 'tab-me';

export function FlightScene({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const sticker = useRef<View>(null);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState('-');
  useEffect(onReady, [onReady]);

  const fly = async (reduceMotion: boolean) => {
    const viewTag = findNodeHandle(sticker.current);
    if (viewTag === null) return setResult('noTag');
    setResult('flying');
    const { landed } = await StickerFlight.flyToTab({ viewTag, tabId: ME_TAB_ID, reduceMotion });
    setResult(landed ? 'landed' : 'notLanded');
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View key={round} style={styles.stage}>
        <View ref={sticker} collapsable={false} testID="flight-sticker">
          <CategorySticker category="pickup" size={96} />
        </View>
      </View>
      <PillButton label={t('debug.flight.fly')} testID="flight-fly" onPress={() => fly(false)} />
      <PillButton
        label={t('debug.flight.flyReduced')}
        variant="secondary"
        testID="flight-fly-reduced"
        onPress={() => fly(true)}
      />
      <PillButton
        label={t('debug.flight.reset')}
        variant="secondary"
        testID="flight-reset"
        onPress={() => {
          setRound((value) => value + 1);
          setResult('-');
        }}
      />
      <AppText variant="secondary" testID="flight-result">
        {result}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: vars['--space-4'], gap: vars['--space-3'] },
  stage: { alignItems: 'center', paddingVertical: vars['--space-6'] },
});

export function FlightRedirect() {
  return <Redirect href="/bounty/debug-flight" />;
}
