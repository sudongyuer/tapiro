import { forwardRef, useCallback, type RefObject } from 'react';
import type { ScrollViewProps } from 'react-native';
import {
  KeyboardChatScrollView,
  type KeyboardChatScrollViewProps,
  type KeyboardChatScrollViewRef,
} from 'react-native-keyboard-controller';

type Props = ScrollViewProps &
  KeyboardChatScrollViewProps & { scrollRef: RefObject<KeyboardChatScrollViewRef | null> };

// FlatList.scrollToEnd ignores the keyboard inset; the scroll view's own scrollToEnd includes it, so the screen keeps
// a second ref to the scroll view beside the one FlatList assigns.
export const ChatScrollView = forwardRef<KeyboardChatScrollViewRef, Props>(function ChatScrollView(
  { scrollRef, ...props },
  ref,
) {
  const both = useCallback(
    (instance: KeyboardChatScrollViewRef | null) => {
      if (typeof ref === 'function') ref(instance);
      else if (ref) ref.current = instance;
      scrollRef.current = instance;
    },
    [ref, scrollRef],
  );
  return (
    <KeyboardChatScrollView
      {...props}
      ref={both}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      keyboardDismissMode="interactive"
    />
  );
});
