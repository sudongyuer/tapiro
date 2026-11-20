import { Stack, useRouter } from 'expo-router';

import { useI18n } from '@/lib/i18n';

import PayeeMethods from '../(tabs)/me/payee';

export default function PayeeMethodsSheet() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t('payee.title') }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('payee.close')}
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <PayeeMethods />
    </>
  );
}
