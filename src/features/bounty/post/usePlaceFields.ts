import { useNativeState } from '@expo/ui/swift-ui';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { placePick } from '../place/placePick';
import { draftStore } from './services';
import type { DraftPlace } from './types';

export function usePlaceFields(userId: string, place: DraftPlace | null, onChange: () => void) {
  const label = useNativeState(place?.label ?? '');
  const address = useNativeState(place?.address ?? '');
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

  function edit(patch: Partial<DraftPlace>) {
    const current = draftStore.load(userId).place;
    if (!current) return;
    draftStore.update(userId, { place: { ...current, ...patch } });
    onChange();
  }

  function remove() {
    label.set('');
    address.set('');
    setFocusLabel(false);
    draftStore.update(userId, { place: null });
    onChange();
  }

  return { label, address, focusLabel, edit, remove };
}
