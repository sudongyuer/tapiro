import { Stack, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { CalendarSheet, monthParam } from '@/features/stickers';
import { useI18n } from '@/lib/i18n';

export default function StickerCalendar() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useSignedInUser();
  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('stickers.calendar.close')}
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      {user ? (
        <CalendarSheet
          userId={user.id}
          onOpen={() => router.back()}
          onShare={(month) =>
            router.push({ pathname: '/sticker-share', params: { month: monthParam(month) } })
          }
        />
      ) : null}
    </>
  );
}
