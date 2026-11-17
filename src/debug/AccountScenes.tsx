import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DeleteAccountSheet,
  LanguageStep,
  NameStep,
  SettingsView,
  WelcomeScreen,
  createFixtureAuthService,
} from '@/features/account';
import { uiVerifyArgument } from '@/lib/uiVerify';

import { LONG_NAME, longNameUser } from './accountFixtures';

type SceneProps = { onReady: () => void };

export function WelcomeScene({ onReady }: SceneProps) {
  return <WelcomeScreen onLayout={onReady} />;
}

function ProductionHeader() {
  return <Stack.Screen options={{ headerTitle: '' }} />;
}

export function LanguageStepScene({ onReady }: SceneProps) {
  return (
    <>
      <ProductionHeader />
      <LanguageStep onDone={() => {}} onLayout={onReady} />
    </>
  );
}

export function ProfileSetupScene({ onReady }: SceneProps) {
  return (
    <>
      <ProductionHeader />
      <NameStep
        user={longNameUser}
        profile={{ displayName: LONG_NAME, avatarUrl: null }}
        onSave={async () => true}
        onDone={() => {}}
        onLayout={onReady}
      />
    </>
  );
}

export function SettingsScene({ onReady }: SceneProps) {
  return (
    <View style={styles.fill} onLayout={onReady}>
      <SettingsView
        name={LONG_NAME}
        email={longNameUser.email}
        avatarUrl={null}
        onSignOut={() => {}}
        onDeleteAccount={() => {}}
      />
    </View>
  );
}

export function DeleteBlockedScene({ onReady }: SceneProps) {
  const paddingTop = useHeaderHeight();
  const { bottom: paddingBottom } = useSafeAreaInsets();
  const [service] = useState(() =>
    createFixtureAuthService({
      signedInAs: 'apple',
      deletion: uiVerifyArgument('uiVerifyDeletion') === 'blockedMany' ? 'blockedMany' : 'blocked',
    }),
  );
  return (
    <View style={[styles.sheetBackground, { paddingTop, paddingBottom }]}>
      <DeleteAccountSheet onDelete={service.deleteAccount} onCancel={() => {}} onLayout={onReady} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheetBackground: { flex: 1, backgroundColor: PlatformColor('systemBackground') },
});
