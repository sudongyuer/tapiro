import { Button, Form, Host, Picker, Section, Text } from '@expo/ui/swift-ui';
import {
  disabled,
  foregroundStyle,
  pickerStyle,
  scrollDismissesKeyboard,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { afterResign } from '@/ui/afterResign';
import { NoticeCard } from '@/ui/NoticeCard';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { useTheme } from '@/ui/theme/useTheme';

import { useMemoryFor } from './hooks';
import {
  checkMemoryDraft,
  MEMORY_KINDS,
  MEMORY_LIMITS,
  type MemoryEntry,
  type MemoryFailure,
  type MemoryKind,
} from './memory';
import { memoryStore } from './services';

type EntryError = `ask.memory.error.${MemoryFailure | 'empty'}` | 'ask.memory.failure.remove';

function Chrome({
  title,
  onClose,
  onSave,
}: {
  title: string;
  onClose: () => void;
  onSave?: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('ask.memory.entry.close')}
          onPress={onClose}
        />
      </Stack.Toolbar>
      {onSave ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="checkmark"
            variant="prominent"
            tintColor={color('--color-accent')}
            accessibilityLabel={t('ask.memory.entry.save')}
            onPress={onSave}
          />
        </Stack.Toolbar>
      ) : null}
    </>
  );
}

export function MemoryEntrySheet({
  userId,
  entryId,
  onDone: leave,
}: {
  userId: string;
  entryId: string | null;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const onDone = afterResign(leave);
  const state = useMemoryFor(userId);
  const title = t(entryId ? 'ask.memory.entry.editTitle' : 'ask.memory.entry.addTitle');
  const entry = entryId ? (state?.data?.entries.find((each) => each.id === entryId) ?? null) : null;
  if (entryId && !entry) {
    const loading = !state?.data && state?.status !== 'failed';
    return (
      <Host style={styles.host} testID="memory-entry-sheet">
        <Chrome title={title} onClose={onDone} />
        <Form>
          {loading ? null : (
            <NoticeCard
              tone={state?.data ? 'warning' : 'urgent'}
              icon="exclamationmark.circle.fill"
              title={t(state?.data ? 'ask.memory.entry.gone' : 'ask.memory.failed')}
              action={
                state?.data
                  ? undefined
                  : {
                      label: t('ask.memory.retry'),
                      onPress: () => void memoryStore.refresh(),
                      testID: 'memory-entry-retry',
                    }
              }
              testID="memory-entry-missing"
            />
          )}
        </Form>
      </Host>
    );
  }
  return <EntryForm key={entry?.id ?? 'new'} entry={entry} title={title} onDone={onDone} />;
}

function EntryForm({
  entry,
  title,
  onDone,
}: {
  entry: MemoryEntry | null;
  title: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [kind, setKind] = useState<MemoryKind>(entry?.kind ?? 'place');
  const [error, setError] = useState<EntryError | null>(null);
  const [saving, setSaving] = useState(false);
  const label = useSyncedText(entry?.label ?? '', () => setError(null));
  const content = useSyncedText(entry?.content ?? '', () => setError(null));

  async function save() {
    if (saving) return;
    const draft = checkMemoryDraft({
      id: entry?.id ?? null,
      kind,
      label: label.sync(),
      content: content.sync(),
    });
    if (!draft) return setError('ask.memory.error.empty');
    setSaving(true);
    const result = await memoryStore.save(draft);
    setSaving(false);
    memoryStore.dismissFailure();
    if (result.ok) onDone();
    else setError(`ask.memory.error.${result.failure}`);
  }

  async function remove() {
    if (!entry || saving) return;
    setSaving(true);
    const result = await memoryStore.remove(entry.id);
    setSaving(false);
    memoryStore.dismissFailure();
    if (result.ok) onDone();
    else setError('ask.memory.failure.remove');
  }

  return (
    <Host style={styles.host} testID="memory-entry-sheet">
      <Chrome title={title} onClose={onDone} onSave={saving ? undefined : () => void save()} />
      <Form modifiers={[tint(color('--color-accent')), scrollDismissesKeyboard('immediately')]}>
        {error ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t(error)}
            testID="memory-entry-error"
          />
        ) : null}
        <Section>
          <Picker
            label={t('ask.memory.entry.kind')}
            selection={kind}
            onSelectionChange={(next: string) => {
              const chosen = MEMORY_KINDS.find((candidate) => candidate === next);
              if (chosen) setKind(chosen);
            }}
            testID="memory-entry-kind"
            modifiers={[pickerStyle('segmented')]}
          >
            {MEMORY_KINDS.map((option) => (
              <Text key={option} modifiers={[tag(option)]}>
                {t(`ask.memory.kind.${option}`)}
              </Text>
            ))}
          </Picker>
        </Section>
        <Section title={t('ask.memory.entry.label')}>
          <SyncedTextField
            field={label}
            maxLength={MEMORY_LIMITS.labelMax}
            placeholder={t('ask.memory.entry.labelPlaceholder')}
            testID="memory-entry-label"
          />
        </Section>
        <Section
          title={t('ask.memory.entry.content')}
          footer={<Text>{t('ask.memory.entry.footer', { provider: t('ask.provider') })}</Text>}
        >
          <SyncedTextField
            field={content}
            maxLength={MEMORY_LIMITS.contentMax}
            placeholder={t('ask.memory.entry.contentPlaceholder')}
            testID="memory-entry-content"
          />
        </Section>
        {entry ? (
          <Section>
            <Button
              label={t('ask.memory.entry.delete')}
              role="destructive"
              onPress={() => void remove()}
              testID="memory-entry-delete"
              modifiers={[foregroundStyle(color('--color-urgent')), disabled(saving)]}
            />
          </Section>
        ) : null}
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
