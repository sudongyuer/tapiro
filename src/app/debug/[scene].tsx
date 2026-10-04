import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { findScene } from '@/debug/scenes';
import { debugToolsEnabled } from '@/lib/uiVerify';

export default function DebugScene() {
  const { scene: id } = useLocalSearchParams<{ scene: string }>();
  const [ready, setReady] = useState(false);
  const scene = findScene(id);

  if (!debugToolsEnabled) return <Redirect href="/" />;
  if (!scene) throw new Error(`Unknown debug scene: ${id}`);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: true, title: scene.title }} />
      <scene.Component onReady={() => setReady(true)} />
      {ready && <View testID="ui-verify-ready" accessible style={styles.marker} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  marker: { position: 'absolute', width: 1, height: 1 },
});
