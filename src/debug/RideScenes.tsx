import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fixtureUser } from '@/features/account';
import { RideConfirm, RideForm, RideListScreen } from '@/features/ride';
import { uiVerifyArgument } from '@/lib/uiVerify';

function Marker({ name }: { name: string | null }) {
  return name ? <View testID={`ride-scene-${name}`} accessible style={styles.marker} /> : null;
}

export function RideListScene({ onReady }: { onReady: () => void }) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(onReady, [onReady]);
  return (
    <>
      <RideListScreen
        onAdd={() => setLeft('add')}
        onOpen={(id) => setLeft(`open-${id}`)}
        onHistory={() => setLeft('history')}
      />
      <Marker name={left} />
    </>
  );
}

export function RideFormScene({ onReady }: { onReady: () => void }) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(onReady, [onReady]);
  return (
    <>
      <RideForm
        userId={fixtureUser('apple').id}
        onNext={() => setLeft('next')}
        onPickPlace={(which) => setLeft(`place-${which}`)}
      />
      <Marker name={left} />
    </>
  );
}

export function RideConfirmScene({ onReady }: { onReady: () => void }) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(onReady, [onReady]);
  return (
    <>
      <RideConfirm
        userId={fixtureUser('apple').id}
        onPublished={() => setLeft('published')}
        onAddPayee={() => setLeft('payee')}
        onBack={() => setLeft('back')}
      />
      <Marker name={left} />
    </>
  );
}

export function RideDetailScene({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    router.push(
      {
        pathname: '/ride/[id]',
        params: { id: uiVerifyArgument('uiVerifyRideDetailId') ?? 'ride-scene' },
      },
      { withAnchor: true },
    );
    onReady();
  }, [router, onReady]);
  return null;
}

const styles = StyleSheet.create({ marker: { position: 'absolute', width: 1, height: 1 } });
