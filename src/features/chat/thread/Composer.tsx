import { GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { PlatformColor, StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { useI18n } from '@/lib/i18n';
import { PressDim } from '@/ui/PressDim';
import { space, typeStyle, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { canSend } from '../chatStore';
import { chatDrafts } from '../services';
import { MESSAGE_MAX } from '../types';

export const COMPOSER_INPUT_ID = 'chat-composer-input';

const BODY = typeStyle('body');
const MAX_LINES = 5;
const TARGET = 44;
const LINE_PADDING = (TARGET - BODY.lineHeight) / 2;
export const COMPOSER_MIN_HEIGHT = TARGET + space.sm * 2;

type Props = {
  userId: string;
  threadId: string;
  bottomInset: number;
  keyboardGap: number;
  onHeight: (height: number) => void;
  onSend: (body: string) => boolean;
};

export function Composer({ userId, threadId, bottomInset, keyboardGap, onHeight, onSend }: Props) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [body, setDraft] = useState(() => chatDrafts.get(userId, threadId));
  const ready = canSend(body);

  const setBody = (text: string) => {
    setDraft(text);
    chatDrafts.set(userId, threadId, text);
  };

  const send = () => {
    if (!onSend(body)) return;
    setBody('');
  };

  return (
    <KeyboardStickyView
      style={styles.dock}
      offset={{ closed: 0, opened: bottomInset - keyboardGap }}
      onLayout={(event: LayoutChangeEvent) => onHeight(event.nativeEvent.layout.height)}
    >
      <View style={[styles.row, { paddingBottom: bottomInset + space.sm }]}>
        <GlassView style={styles.field}>
          <TextInput
            nativeID={COMPOSER_INPUT_ID}
            testID="chat-composer-input"
            accessibilityLabel={t('chat.thread.placeholder')}
            style={[styles.input, { color: PlatformColor('label') }]}
            placeholder={t('chat.thread.placeholder')}
            placeholderTextColor={PlatformColor('placeholderText')}
            multiline
            maxLength={MESSAGE_MAX}
            value={body}
            onChangeText={setBody}
          />
          {ready ? (
            <PressDim
              testID="chat-composer-send"
              accessibilityRole="button"
              accessibilityLabel={t('chat.thread.send')}
              hitSlop={space.xs}
              style={styles.send}
              onPress={send}
            >
              <SymbolView
                name="arrow.up.circle.fill"
                size={TARGET - space.md}
                tintColor={color('--color-accent')}
              />
            </PressDim>
          ) : null}
        </GlassView>
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  row: { paddingHorizontal: space.md, paddingTop: space.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: TARGET,
    borderRadius: vars['--radius-sheet'],
    paddingLeft: space.lg,
  },
  input: {
    flex: 1,
    fontSize: BODY.fontSize,
    lineHeight: BODY.lineHeight,
    maxHeight: BODY.lineHeight * MAX_LINES + LINE_PADDING * 2,
    paddingTop: LINE_PADDING,
    paddingBottom: LINE_PADDING,
  },
  send: { width: TARGET, height: TARGET, alignItems: 'center', justifyContent: 'center' },
});
