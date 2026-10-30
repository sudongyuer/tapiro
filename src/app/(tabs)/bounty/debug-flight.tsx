import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FlightScene } from '@/debug/FlightScene';
import { useI18n } from '@/lib/i18n';
import { debugToolsEnabled } from '@/lib/uiVerify';

export default function DebugFlight() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  if (!debugToolsEnabled) return <Redirect href="/" />;
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: t('debug.flight.title'), headerLargeTitleEnabled: false }} />
      <FlightScene onReady={() => setReady(true)} />
      {ready && <View testID="ui-verify-ready" accessible style={styles.marker} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  marker: { position: 'absolute', width: 1, height: 1 },
});
