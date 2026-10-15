import { Stack, useRouter } from 'expo-router';

import { LegalDocument } from '@/features/account';
import { useI18n } from '@/lib/i18n';

export default function LegalTerms() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: t('account.legal.terms.title') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('account.legal.close')}
          onPress={() => router.back()}
        >
          {t('account.legal.close')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <LegalDocument page="terms" />
    </>
  );
}
