import { Stack } from 'expo-router';
import { useState } from 'react';
import { PlatformColor, ScrollView, StyleSheet, View } from 'react-native';

import {
  DeleteAccountSheet,
  LanguageStep,
  NameStep,
  SettingsView,
  WelcomeScreen,
  createFixtureAuthService,
} from '@/features/account';

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
        onSignOut={() => {}}
        onDeleteAccount={() => {}}
      />
    </View>
  );
}

export function DeleteBlockedScene({ onReady }: SceneProps) {
  const [service] = useState(() =>
    createFixtureAuthService({ signedInAs: 'apple', deletion: 'blocked' }),
  );
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.sheetBackground}>
      <DeleteAccountSheet onDelete={service.deleteAccount} onCancel={() => {}} onLayout={onReady} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheetBackground: { flex: 1, backgroundColor: PlatformColor('systemBackground') },
});
