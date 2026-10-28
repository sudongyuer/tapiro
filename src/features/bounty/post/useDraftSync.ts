import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { typedPatch } from './draftSync';
import { draftStore } from './services';

type Text = { sync(): string };

// Once the native views are gone, reading them throws (NotFoundException), so the unmount read is best effort; a
// swipe-down ends editing first, which already synced through the field's blur.
export function useDraftSync(
  userId: string,
  draftId: string,
  fields: { title: Text; reward: Text; description: Text; placeLabel: Text; address: Text },
) {
  const { title, reward, description, placeLabel, address } = fields;
  const sync = useCallback(() => {
    let typed;
    try {
      typed = {
        title: title.sync(),
        rewardText: reward.sync(),
        description: description.sync(),
        placeLabel: placeLabel.sync(),
        address: address.sync(),
      };
    } catch {
      return;
    }
    const patch = typedPatch(draftStore.load(userId), draftId, typed);
    if (patch) draftStore.update(userId, patch);
  }, [userId, draftId, title, reward, description, placeLabel, address]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') sync();
    });
    return () => {
      subscription.remove();
      sync();
    };
  }, [sync]);

  return sync;
}
