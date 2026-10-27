import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fixtureUser } from '@/features/account';
import { PlaceSearchScreen, PostConfirm, PostForm } from '@/features/bounty';

function Marker({ name }: { name: string | null }) {
  return name ? (
    <View testID={`bounty-post-scene-${name}`} accessible style={styles.marker} />
  ) : null;
}

export function BountyPostScene({ onReady }: { onReady: () => void }) {
  const [left, setLeft] = useState<'next' | 'close' | 'place' | null>(null);
  useEffect(onReady, [onReady]);
  return (
    <>
      <PostForm
        userId={fixtureUser('apple').id}
        onNext={() => setLeft('next')}
        onClose={() => setLeft('close')}
        onPickPlace={() => setLeft('place')}
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

export function PlaceSearchScene({ onReady }: { onReady: () => void }) {
  const [picked, setPicked] = useState(0);
  useEffect(onReady, [onReady]);
  return (
    <>
      <PlaceSearchScreen purpose="post" onPicked={() => setPicked((count) => count + 1)} />
      {picked > 0 ? (
        <View testID="place-search-scene-picked" accessible style={styles.marker} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({ marker: { position: 'absolute', width: 1, height: 1 } });
