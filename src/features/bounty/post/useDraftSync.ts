import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { typedPatch } from './draftSync';
import { draftStore } from './services';

type Text = { get(): string };

// onTextChange can miss the last keystroke when keys arrive faster than SwiftUI's change handler runs; the native
// values are read back before anything depends on the stored draft, and before the form can disappear. Once the
// native views are gone, reading them throws (NotFoundException), so the unmount read is best effort; a swipe-down
// ends editing first, which already synced through the field's blur.
export function useDraftSync(
  userId: string,
  draftId: string,
  fields: { title: Text; reward: Text; description: Text },
) {
  const { title, reward, description } = fields;
  const sync = useCallback(() => {
    let typed;
    try {
      typed = { title: title.get(), rewardText: reward.get(), description: description.get() };
    } catch {
      return;
    }
    const patch = typedPatch(draftStore.load(userId), draftId, typed);
    if (patch) draftStore.update(userId, patch);
  }, [userId, draftId, title, reward, description]);

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
