import { TextField, useNativeState, type TextFieldProps } from '@expo/ui/swift-ui';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { createTextSync } from './textSync';

type NativeState = NonNullable<TextFieldProps['text']>;

export type SyncedText = {
  state: NativeState;
  sync: () => string;
  set: (text: string) => void;
};

export function useSyncedText(initial: string, onChange: (text: string) => void): SyncedText {
  const state = useNativeState(initial);
  const [start] = useState(initial);
  const sync = useMemo(() => createTextSync(state, start), [state, start]);
  useLayoutEffect(() => sync.listen(onChange));
  useEffect(() => sync.attach(), [sync]);
  return useMemo(() => ({ state, sync: sync.sync, set: sync.set }), [state, sync]);
}

type Props = Omit<TextFieldProps, 'text' | 'onTextChange' | 'onSelectionChange'> & {
  field: SyncedText;
};

export function SyncedTextField({ field, onFocusChange, ...props }: Props) {
  return (
    <TextField
      {...props}
      text={field.state}
      onTextChange={() => field.sync()}
      // TextFieldView posts onTextChange only for edits it flags as user-made, so the last keystroke of a fast burst
      // can arrive with no event; the cursor move and focus change after it still arrive, so they re-read the text.
      onSelectionChange={() => field.sync()}
      onFocusChange={(focused) => {
        field.sync();
        onFocusChange?.(focused);
      }}
    />
  );
}
