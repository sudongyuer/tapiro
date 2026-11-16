import {
  Button,
  ConfirmationDialog,
  HStack,
  Host,
  List,
  ProgressView,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHint,
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listStyle,
  multilineTextAlignment,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { PlatformColor, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useMemoryFor } from './hooks';
import { MEMORY_KINDS, MEMORY_LIMITS, type MemoryEntry } from './memory';
import type { MemoryState } from './memoryStore';
import { memoryStore } from './services';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function MemoryScreen({
  userId,
  onAdd,
  onEdit,
}: {
  userId: string | null;
  onAdd: () => void;
  onEdit: (id: string) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const state = useMemoryFor(userId);
  const data = state?.data ?? null;
  const retry = {
    label: t('ask.memory.retry'),
    onPress: () => void memoryStore.refresh(),
    testID: 'memory-retry',
  };

  return (
    <Host style={styles.host} testID="memory-screen">
      <List modifiers={[listStyle('insetGrouped'), tint(color('--color-accent'))]}>
        {!data && state?.status !== 'failed' ? (
          <Section>
            <ProgressView
              modifiers={[
                frame({ maxWidth: Infinity, minHeight: vars['--touch-min'] }),
                accessibilityLabel(t('ask.memory.loading')),
                accessibilityIdentifier('memory-loading'),
              ]}
            />
          </Section>
        ) : null}
        {!data && state?.status === 'failed' ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('ask.memory.failed')}
            action={retry}
            testID="memory-failed"
          />
        ) : null}
        {data && state?.status === 'stale' ? (
          <NoticeCard
            tone="warning"
            icon="exclamationmark.triangle.fill"
            title={t('ask.memory.stale')}
            action={retry}
            testID="memory-stale"
          />
        ) : null}
        {state?.failure ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t(`ask.memory.failure.${state.failure.write}`)}
            testID="memory-write-failed"
          />
        ) : null}
        {data && state ? <SwitchSection state={state} enabled={data.enabled} /> : null}
        {data && state ? (
          <Entries state={state} entries={data.entries} enabled={data.enabled} onEdit={onEdit} />
        ) : null}
        {data && data.enabled ? (
          <AddSection full={data.entries.length >= MEMORY_LIMITS.entriesMax} onAdd={onAdd} />
        ) : null}
        {data && data.entries.length > 0 ? (
          <ClearSection count={data.entries.length} busy={state?.writing !== null} />
        ) : null}
      </List>
    </Host>
  );
}

function SwitchSection({ state, enabled }: { state: MemoryState; enabled: boolean }) {
  const { t } = useI18n();
  const [flips, setFlips] = useState(0);
  const footer = enabled
    ? t('ask.memory.onFooter', { provider: t('ask.provider') })
    : t('ask.memory.offFooter');
  return (
    <Section footer={<Text modifiers={[accessibilityIdentifier('memory-footer')]}>{footer}</Text>}>
      {state.writing === 'switch' ? (
        <HStack
          modifiers={[accessibilityElement('combine'), accessibilityIdentifier('memory-switching')]}
        >
          <Text>{t('ask.memory.switch')}</Text>
          <Spacer />
          <ProgressView modifiers={[accessibilityLabel(t('ask.memory.switching'))]} />
        </HStack>
      ) : (
        <Toggle
          key={`memory-${enabled}-${flips}`}
          label={t('ask.memory.switch')}
          isOn={enabled}
          onIsOnChange={(on) => {
            setFlips((count) => count + 1);
            void memoryStore.setEnabled(on);
          }}
          testID="memory-switch"
          modifiers={[tint(PlatformColor('systemGreen')), disabled(state.writing !== null)]}
        />
      )}
    </Section>
  );
}

function Entries({
  state,
  entries,
  enabled,
  onEdit,
}: {
  state: MemoryState;
  entries: MemoryEntry[];
  enabled: boolean;
  onEdit: (id: string) => void;
}) {
  const { t } = useI18n();
  const shown = entries.filter((entry) => !state.removing.includes(entry.id));
  if (shown.length === 0) {
    return (
      <Section>
        <VStack
          alignment="leading"
          spacing={vars['--space-1']}
          modifiers={[accessibilityElement('combine'), accessibilityIdentifier('memory-empty')]}
        >
          <Text modifiers={[font({ textStyle: 'headline' })]}>{t('ask.memory.emptyTitle')}</Text>
          <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>
            {t(enabled ? 'ask.memory.emptyBody' : 'ask.memory.emptyBodyOff')}
          </Text>
        </VStack>
      </Section>
    );
  }
  return (
    <>
      {MEMORY_KINDS.map((kind) => {
        const rows = shown.filter((entry) => entry.kind === kind);
        if (rows.length === 0) return null;
        return (
          <Section key={kind} title={t(`ask.memory.kind.${kind}`)}>
            <List.ForEach
              onDelete={(indices) =>
                indices.forEach((index) => void memoryStore.remove(rows[index].id))
              }
            >
              {rows.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onPress={() => onEdit(entry.id)} />
              ))}
            </List.ForEach>
          </Section>
        );
      })}
    </>
  );
}

function EntryRow({ entry, onPress }: { entry: MemoryEntry; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Button onPress={onPress} testID={`memory-row-${entry.id}`}>
      <HStack
        spacing={vars['--space-3']}
        modifiers={[
          accessibilityElement('combine'),
          accessibilityLabel(t('ask.memory.row', { label: entry.label, content: entry.content })),
          accessibilityHint(t('ask.memory.rowHint')),
        ]}
      >
        <Text
          modifiers={[foregroundStyle({ type: 'hierarchical', style: 'primary' }), lineLimit(2)]}
        >
          {entry.label}
        </Text>
        <Spacer />
        <Text modifiers={[secondary, lineLimit(2), multilineTextAlignment('trailing')]}>
          {entry.content}
        </Text>
      </HStack>
    </Button>
  );
}

function AddSection({ full, onAdd }: { full: boolean; onAdd: () => void }) {
  const { t } = useI18n();
  const footer = full ? (
    <Text modifiers={[accessibilityIdentifier('memory-full')]}>
      {t('ask.memory.fullFooter', { count: MEMORY_LIMITS.entriesMax })}
    </Text>
  ) : undefined;
  return (
    <Section footer={footer}>
      <Button
        label={t('ask.memory.add')}
        systemImage="plus"
        onPress={onAdd}
        testID="memory-add"
        modifiers={[disabled(full)]}
      />
    </Section>
  );
}

function ClearSection({ count, busy }: { count: number; busy: boolean }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [asking, setAsking] = useState(false);
  return (
    <Section>
      <ConfirmationDialog
        title={t('ask.memory.clearTitle', { count })}
        titleVisibility="visible"
        isPresented={asking}
        onIsPresentedChange={setAsking}
      >
        <ConfirmationDialog.Trigger>
          <Button
            role="destructive"
            onPress={() => setAsking(true)}
            testID="memory-clear"
            modifiers={[foregroundStyle(color('--color-urgent')), disabled(busy)]}
          >
            <Text modifiers={[frame({ maxWidth: Infinity })]}>{t('ask.memory.clearAll')}</Text>
          </Button>
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button
            label={t('ask.memory.clearConfirm')}
            role="destructive"
            onPress={() => void memoryStore.clearAll()}
            testID="memory-clear-confirm"
          />
          <Button label={t('ask.memory.cancel')} role="cancel" />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <Text>{t('ask.memory.clearMessage')}</Text>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Section>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
