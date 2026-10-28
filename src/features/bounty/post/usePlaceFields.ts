import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSyncedText } from '@/ui/SyncedTextField';

import { placePick } from '../place/placePick';
import { draftStore } from './services';
import type { DraftPlace } from './types';

export function usePlaceFields(userId: string, place: DraftPlace | null, onChange: () => void) {
  function edit(patch: Partial<DraftPlace>) {
    const current = draftStore.load(userId).place;
    if (!current) return;
    draftStore.update(userId, { place: { ...current, ...patch } });
    onChange();
  }

  const label = useSyncedText(place?.label ?? '', (text) => edit({ label: text }));
  const address = useSyncedText(place?.address ?? '', (text) =>
    edit({ address: text === '' ? null : text }),
  );
  const [focusLabel, setFocusLabel] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const pick = placePick.take('post');
      if (!pick) return;
      label.set(pick.name);
      address.set('');
      setFocusLabel(pick.name === '');
      draftStore.update(userId, {
        place: {
          label: pick.name,
          latitude: pick.latitude,
          longitude: pick.longitude,
          address: null,
        },
      });
      onChange();
    }, [userId, label, address, onChange]),
  );

  function remove() {
    label.set('');
    address.set('');
    setFocusLabel(false);
    draftStore.update(userId, { place: null });
    onChange();
  }

  return { label, address, focusLabel, remove };
}
