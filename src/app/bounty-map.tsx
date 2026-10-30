import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';

import { BoardMapCover, boardLink, useLinkedBoard } from '@/features/bounty';
import { useI18n } from '@/lib/i18n';

export default function BountyMapRoute() {
  const router = useRouter();
  const { t } = useI18n();
  const linked = useLinkedBoard();
  const [start] = useState(boardLink.startRegion);
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('bounty.board.map.close')}
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      {linked ? (
        <BoardMapCover
          board={linked.board}
          start={start}
          onPost={linked.onPost}
          onOpen={(id) => {
            router.back();
            router.push({ pathname: '/bounty/[id]', params: { id } });
          }}
          onApply={(id) =>
            router.push({ pathname: '/bounty-apply/[id]', params: { id, from: 'card' } })
          }
        />
      ) : null}
    </>
  );
}
