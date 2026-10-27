import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fixtureUser } from '@/features/account';
import { PostConfirm, PostForm } from '@/features/bounty';

function Marker({ name }: { name: string | null }) {
  return name ? (
    <View testID={`bounty-post-scene-${name}`} accessible style={styles.marker} />
  ) : null;
}

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
      <Marker name={left} />
    </>
  );
}

export function BountyConfirmScene({ onReady }: { onReady: () => void }) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(onReady, [onReady]);
  return (
    <>
      <PostConfirm
        userId={fixtureUser('apple').id}
        onPublished={() => setLeft('published')}
        onPay={(paymentId) => setLeft(`pay-${paymentId}`)}
        onBack={() => setLeft('back')}
      />
      <Marker name={left} />
    </>
  );
}

const styles = StyleSheet.create({ marker: { position: 'absolute', width: 1, height: 1 } });
