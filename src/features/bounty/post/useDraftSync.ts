import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { typedPatch } from './draftSync';
import { draftStore } from './services';

type Text = { sync(): string };

export function useDraftSync(
  userId: string,
  draftId: string,
  fields: { title: Text; reward: Text; description: Text; placeLabel: Text; address: Text },
) {
  const { title, reward, description, placeLabel, address } = fields;
  const sync = useCallback(() => {
    const typed = {
      title: title.sync(),
      rewardText: reward.sync(),
      description: description.sync(),
      placeLabel: placeLabel.sync(),
      address: address.sync(),
    };
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
