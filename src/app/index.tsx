import { Redirect } from 'expo-router';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useAccountStage } from '@/features/account';
import { uiVerifyScene } from '@/lib/uiVerify';

const STAGE_ROUTES = {
  signedOut: '/welcome',
  onboarding: '/onboarding',
  ready: '/bounty',
} as const;

export default function Index() {
  const stage = useAccountStage();

  if (uiVerifyScene) {
    return <Redirect href={{ pathname: '/debug/[scene]', params: { scene: uiVerifyScene } }} />;
  }
  if (stage === 'loading') return <View style={styles.container} />;
  return <Redirect href={STAGE_ROUTES[stage]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
});
