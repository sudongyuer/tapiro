import { Image } from 'expo-image';
import { Modal, PlatformColor, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { useQrImage } from './useQrImage';

const MAX_QR = 360;

export function QrFullScreen({
  payload,
  name,
  visible,
  onClose,
}: {
  payload: string;
  name: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const side = Math.min(width - vars['--space-5'] * 2, MAX_QR);
  const uri = useQrImage(payload, Math.round(side));
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <AppText variant="title" style={styles.center}>
            {t('pay.sheet.qr.fullTitle')}
          </AppText>
          {uri ? (
            <Image
              source={{ uri }}
              style={{ width: side, height: side }}
              accessible
              accessibilityLabel={t('pay.sheet.qr.imageLabel', { name })}
              testID="pay-qr-full-image"
            />
          ) : (
            <View style={{ width: side, height: side }} />
          )}
          <AppText variant="body" style={styles.center}>
            {name}
          </AppText>
        </View>
        <View style={styles.footer}>
          <PillButton label={t('pay.sheet.qr.done')} onPress={onClose} testID="pay-qr-full-done" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemBackground') },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars['--space-5'],
    paddingHorizontal: vars['--space-5'],
  },
  center: { textAlign: 'center' },
  footer: { paddingHorizontal: vars['--space-5'], paddingBottom: vars['--space-4'] },
});
