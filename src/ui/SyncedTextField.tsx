import { TextField, useNativeState, type TextFieldProps } from '@expo/ui/swift-ui';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

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

const SETTLE_MS = 150;

export function SyncedTextField({ field, onFocusChange, ...props }: Props) {
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(settle.current), []);
  // TextFieldView posts onTextChange only for edits it flags as user-made, so the last keystrokes of a fast burst can
  // arrive with no event at all; every event re-reads the text, and one more read after the burst settles catches them.
  const resync = () => {
    field.sync();
    clearTimeout(settle.current);
    settle.current = setTimeout(field.sync, SETTLE_MS);
  };
  return (
    <TextField
      {...props}
      text={field.state}
      onTextChange={resync}
      onSelectionChange={resync}
      onFocusChange={(focused) => {
        resync();
        onFocusChange?.(focused);
      }}
    />
  );
}
