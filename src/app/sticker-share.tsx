import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { parseShareTarget, ShareSheet } from '@/features/stickers';
import { useI18n } from '@/lib/i18n';
import { dateFormat } from '@/lib/intlCache';

export default function StickerShare() {
  const { t, language } = useI18n();
  const router = useRouter();
  const user = useSignedInUser();
  const { card, month } = useLocalSearchParams<{ card?: string; month?: string }>();
  const target = parseShareTarget(card, month);
  const title =
    target && 'month' in target
      ? t('stickers.share.titleMonth', {
          month: dateFormat(language, { month: 'long' }).format(
            new Date(target.month.year, target.month.month, 1),
          ),
        })
      : t('stickers.share.titleCard');
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('stickers.share.close')}
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      {user && target ? <ShareSheet userId={user.id} target={target} /> : null}
    </>
  );
}
