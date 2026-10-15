import { Stack, useRouter } from 'expo-router';

import { LegalDocument } from '@/features/account';
import { useI18n } from '@/lib/i18n';

export default function LegalPrivacy() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: t('account.legal.privacy.title') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('account.legal.close')}
          onPress={() => router.back()}
        >
          {t('account.legal.close')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <LegalDocument page="privacy" />
    </>
  );
}
