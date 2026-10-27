import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fixtureUser } from '@/features/account';
import { PostForm } from '@/features/bounty';

export function BountyPostScene({ onReady }: { onReady: () => void }) {
  const [left, setLeft] = useState<'next' | 'close' | null>(null);
  useEffect(onReady, [onReady]);
  return (
    <>
      <PostForm
        userId={fixtureUser('apple').id}
        onNext={() => setLeft('next')}
        onClose={() => setLeft('close')}
      />
      {left ? <View testID={`bounty-post-scene-${left}`} accessible style={styles.marker} /> : null}
    </>
  );
}

const styles = StyleSheet.create({ marker: { position: 'absolute', width: 1, height: 1 } });
