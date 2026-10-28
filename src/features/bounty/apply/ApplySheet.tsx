import {
  Button,
  Form,
  Host,
  HStack,
  ProgressView,
  Section,
  Spacer,
  Text,
  TextField,
  useNativeState,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  font,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { ApplySurface } from '../shared/justApplied';
import { canSend, NOTE_MAX, noteCount, type ApplyState } from './applyState';
import { noteDrafts } from './noteDrafts';
import { posterName, useApply } from './useApply';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

type Props = {
  id: string;
  surface: ApplySurface;
  onClose: () => void;
  onAddPayee: () => void;
};

export function ApplySheet({ id, surface, onClose, onAddPayee }: Props) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { state, send } = useApply(id, surface, onClose);
  const name = posterName(id) ?? t('bounty.post.unknownName');
  const sending = state.kind === 'form' && state.sending;
  const text = useNativeState(noteDrafts.get(id));
  const submit = () => {
    noteDrafts.set(id, text.get());
    void send();
  };

  return (
    <>
      <Stack.Screen options={{ title: t('bounty.apply.title'), gestureEnabled: !sending }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('bounty.apply.close')}
          disabled={sending}
          onPress={onClose}
        />
      </Stack.Toolbar>
      <SendItem state={state} onSend={submit} />
      <Host style={styles.host} testID="bounty-apply">
        <Form modifiers={[tint(color('--color-accent'))]}>
          {state.kind === 'checking' ? (
            <Section>
              <ProgressView
                modifiers={[
                  accessibilityLabel(t('bounty.apply.checking')),
                  accessibilityIdentifier('bounty-apply-checking'),
                ]}
              />
            </Section>
          ) : state.kind === 'noPayee' ? (
            <NoPayee name={name} onAdd={onAddPayee} />
          ) : state.kind === 'form' ? (
            <>
              {state.reason ? (
                <NoticeCard
                  tone="urgent"
                  icon="exclamationmark.circle.fill"
                  title={t(`bounty.apply.${state.reason}`)}
                  testID="bounty-apply-failed"
                />
              ) : null}
              <NoteSection id={id} name={name} text={text} locked={sending} />
            </>
          ) : null}
        </Form>
      </Host>
    </>
  );
}

function SendItem({ state, onSend }: { state: ApplyState; onSend: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  if (state.kind === 'form' && state.sending) {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <ActivityIndicator
            accessible
            accessibilityLabel={t('bounty.apply.sending')}
            testID="bounty-apply-sending"
            style={styles.sending}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    );
  }
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        variant="prominent"
        tintColor={color('--color-accent')}
        hidden={state.kind !== 'form'}
        disabled={!canSend(state)}
        onPress={onSend}
      >
        {t('bounty.apply.send')}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

type NativeText = ReturnType<typeof useNativeState<string>>;

function NoteSection({
  id,
  name,
  text,
  locked,
}: {
  id: string;
  name: string;
  text: NativeText;
  locked: boolean;
}) {
  const { t } = useI18n();
  const [typed, setTyped] = useState(noteDrafts.get(id));
  const sync = () => {
    const current = text.get();
    noteDrafts.set(id, current);
    setTyped(current);
  };
  const count = noteCount(typed);
  return (
    <Section
      title={t('bounty.apply.noteLabel', { name })}
      footer={
        <VStack alignment="leading" spacing={vars['--space-1']}>
          <Text>{t('bounty.apply.footerSeen', { name })}</Text>
          <Text>{t('bounty.apply.footerWithdraw')}</Text>
        </VStack>
      }
    >
      <TextField
        text={text}
        axis="vertical"
        autoFocus
        maxLength={NOTE_MAX}
        placeholder={t('bounty.apply.placeholder')}
        onTextChange={sync}
        // TextFieldView drops the change event for an edit it does not flag as user-made (the last
        // keystroke of a fast burst, seen in verify runs); the cursor move after it still arrives.
        onSelectionChange={sync}
        onFocusChange={sync}
        testID="bounty-apply-note"
        modifiers={[
          lineLimit({ min: 4, max: 8 }),
          accessibilityLabel(t('bounty.apply.noteLabel', { name })),
          disabled(locked),
        ]}
      />
      <HStack>
        <Spacer />
        <Text
          modifiers={[
            secondary,
            monospacedDigit(),
            accessibilityLabel(t('bounty.apply.countLabel', { count, max: NOTE_MAX })),
            accessibilityIdentifier('bounty-apply-count'),
          ]}
        >
          {t('bounty.apply.count', { count, max: NOTE_MAX })}
        </Text>
      </HStack>
    </Section>
  );
}

function NoPayee({ name, onAdd }: { name: string; onAdd: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Section>
      <VStack
        alignment="leading"
        spacing={vars['--space-2']}
        modifiers={[
          accessibilityElement('combine'),
          accessibilityIdentifier('bounty-apply-no-payee'),
        ]}
      >
        <Text modifiers={[font({ textStyle: 'headline' })]}>{t('bounty.apply.noPayee.title')}</Text>
        <Text modifiers={[secondary]}>{t('bounty.apply.noPayee.body', { name })}</Text>
      </VStack>
      <Button
        label={t('bounty.apply.noPayee.add')}
        systemImage="plus"
        onPress={onAdd}
        testID="bounty-apply-add-payee"
        modifiers={[foregroundStyle(color('--color-accent'))]}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  sending: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});
