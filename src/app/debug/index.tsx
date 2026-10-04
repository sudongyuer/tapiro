import { Link, Redirect, Stack } from 'expo-router';
import { PlatformColor, ScrollView, StyleSheet } from 'react-native';

import { scenes } from '@/debug/scenes';
import { debugToolsEnabled } from '@/lib/uiVerify';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

export default function DebugIndex() {
  if (!debugToolsEnabled) return <Redirect href="/" />;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ headerShown: true, title: 'Debug' }} />
      {scenes.map((scene) => (
        <Link
          key={scene.id}
          href={{ pathname: '/debug/[scene]', params: { scene: scene.id } }}
          testID={`debug-scene-${scene.id}`}
          style={styles.row}
        >
          <AppText variant="body">{scene.title}</AppText>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { padding: vars['--space-4'], gap: vars['--space-2'] },
  row: {
    minHeight: vars['--touch-min'],
    padding: vars['--space-3'],
    borderRadius: vars['--radius-chip'],
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
});
