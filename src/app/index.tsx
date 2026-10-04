import { Redirect } from 'expo-router';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { uiVerify, uiVerifyScene } from '@/lib/uiVerify';

export default function Index() {
  if (uiVerifyScene) {
    return <Redirect href={{ pathname: '/debug/[scene]', params: { scene: uiVerifyScene } }} />;
  }

  return (
    <View testID="home-screen" style={styles.container}>
      {uiVerify && <View testID="ui-verify-ready" accessible style={styles.marker} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  marker: { position: 'absolute', width: 1, height: 1 },
});
