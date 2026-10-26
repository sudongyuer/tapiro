import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, PlatformColor, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

type Load = { path: string; uri: string | null; failed: boolean };

export function ProofViewer({
  path,
  load,
  onClose,
}: {
  path: string | null;
  load: (path: string) => Promise<string>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useState<Load | null>(null);

  useEffect(() => {
    if (!path) return;
    let live = true;
    load(path).then(
      (uri) => live && setShown({ path, uri, failed: false }),
      () => live && setShown({ path, uri: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [path, load]);

  const current = shown?.path === path ? shown : null;
  return (
    <Modal
      visible={path !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          {current?.uri ? (
            <Image
              source={{ uri: current.uri }}
              style={styles.image}
              contentFit="contain"
              accessible
              accessibilityLabel={t('pay.payee.proofLabel')}
              testID="pay-proof-image"
            />
          ) : (
            <AppText variant="body" tone="secondaryLabel" testID="pay-proof-status">
              {current?.failed ? t('pay.payee.proofFailed') : t('pay.sheet.loading')}
            </AppText>
          )}
        </View>
        <View style={styles.footer}>
          <PillButton label={t('pay.sheet.qr.done')} onPress={onClose} testID="pay-proof-close" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemBackground') },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: vars['--space-5'] },
  image: { width: '100%', height: '100%' },
  footer: { paddingHorizontal: vars['--space-5'], paddingBottom: vars['--space-4'] },
});
