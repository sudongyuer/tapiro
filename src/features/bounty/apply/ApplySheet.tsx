import { Form, Host, HStack, ProgressView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  fixedSize,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { afterResign } from '@/ui/afterResign';
import { InlineState } from '@/ui/InlineState';
import { NoticeCard } from '@/ui/NoticeCard';
import { PillButton } from '@/ui/PillButton';
import { SheetActions, SheetFrame } from '@/ui/SheetFrame';
import { SyncedTextField, useSyncedText, type SyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { ApplySurface } from '../shared/justApplied';
import { StateRow } from '../shared/StateRow';
import { canSend, NOTE_MAX, noteCount, type ApplyState } from './applyState';
import { noteDrafts } from './services';
import { posterName, useApply } from './useApply';

type Props = {
  id: string;
  surface: ApplySurface;
  onClose: () => void;
  onAddPayee: () => void;
};

export function ApplySheet({ id, surface, onClose: leave, onAddPayee: addPayee }: Props) {
  const onClose = useMemo(() => afterResign(leave), [leave]);
  const onAddPayee = afterResign(addPayee);
  const { t } = useI18n();
  const { color } = useTheme();
  const { state, send } = useApply(id, surface, onClose);
  const name = posterName(id) ?? t('bounty.post.unknownName');
  const sending = state.kind === 'form' && state.sending;
  const [typed, setTyped] = useState(() => noteDrafts.get(id));
  const note = useSyncedText(typed, (text) => {
    noteDrafts.set(id, text);
    setTyped(text);
  });
  const submit = afterResign(() => {
    note.sync();
    void send();
  });

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
      <SendItem state={state} ready={canSend(state, typed)} onSend={submit} />
      {state.kind === 'noPayee' ? (
        <NoPayee name={name} onAdd={onAddPayee} />
      ) : (
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
                <NoteSection name={name} note={note} count={noteCount(typed)} locked={sending} />
              </>
            ) : null}
          </Form>
        </Host>
      )}
    </>
  );
}

function SendItem({
  state,
  ready,
  onSend,
}: {
  state: ApplyState;
  ready: boolean;
  onSend: () => void;
}) {
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
        disabled={!ready}
        onPress={onSend}
      >
        {t('bounty.apply.send')}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

function NoteSection({
  name,
  note,
  count,
  locked,
}: {
  name: string;
  note: SyncedText;
  count: number;
  locked: boolean;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const over = count > NOTE_MAX;
  return (
    <Section
      title={t('bounty.apply.noteLabel', { name })}
      footer={
        <VStack alignment="leading" spacing={vars['--space-1']}>
          <HStack alignment="top" spacing={vars['--space-2']}>
            <Text modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
              {t('bounty.apply.footerSeen', { name })}
            </Text>
            <Text
              modifiers={[
                ...(over ? [foregroundStyle(color('--color-urgent'))] : []),
                monospacedDigit(),
                fixedSize(),
                accessibilityLabel(t('bounty.apply.countLabel', { count, max: NOTE_MAX })),
                accessibilityIdentifier('bounty-apply-count'),
              ]}
            >
              {t('bounty.apply.count', { count, max: NOTE_MAX })}
            </Text>
          </HStack>
          <Text>{t('bounty.apply.footerWithdraw')}</Text>
        </VStack>
      }
    >
      <SyncedTextField
        field={note}
        axis="vertical"
        autoFocus
        maxLength={NOTE_MAX}
        placeholder={t('bounty.apply.placeholder')}
        testID="bounty-apply-note"
        modifiers={[
          lineLimit({ min: 4, max: 8 }),
          accessibilityLabel(t('bounty.apply.noteLabel', { name })),
          disabled(locked),
        ]}
      />
    </Section>
  );
}

function NoPayee({ name, onAdd }: { name: string; onAdd: () => void }) {
  const { t } = useI18n();
  return (
    <SheetFrame testID="bounty-apply">
      <StateRow>
        <InlineState
          text={[t('bounty.apply.noPayee.title'), t('bounty.apply.noPayee.body', { name })].join(
            '\n',
          )}
          testID="bounty-apply-no-payee"
        />
      </StateRow>
      <SheetActions>
        <PillButton
          label={t('bounty.apply.noPayee.add')}
          onPress={onAdd}
          testID="bounty-apply-add-payee"
        />
      </SheetActions>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  sending: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});
