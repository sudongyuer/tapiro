import {
  Button,
  Host,
  HStack,
  List,
  ProgressView,
  Section,
  Spacer,
  SwipeActions,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  listStyle,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';

import type { BlockListState } from './blockFlow';
import { useBlockList } from './hooks';
import type { BlockedPerson } from './types';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function BlockedListScreen() {
  const { t } = useI18n();
  const { state, retry, unblock } = useBlockList();
  const retryAction = {
    label: t('bounty.block.list.retry'),
    onPress: () => void retry(),
    testID: 'blocked-retry',
  };

  return (
    <Host style={styles.host} testID="blocked-screen">
      <List modifiers={[listStyle('insetGrouped')]}>
        {state.kind === 'loading' ? (
          <Section>
            <ProgressView
              modifiers={[
                frame({ maxWidth: Infinity, minHeight: vars['--touch-min'] }),
                accessibilityLabel(t('bounty.block.list.loading')),
                accessibilityIdentifier('blocked-loading'),
              ]}
            />
          </Section>
        ) : null}
        {state.kind === 'failed' ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('bounty.block.list.failed')}
            action={{
              ...retryAction,
              busyLabel: state.retrying ? t('bounty.block.list.loading') : undefined,
            }}
            testID="blocked-failed"
          />
        ) : null}
        {state.kind === 'ready' ? (
          <ReadySections state={state} retryAction={retryAction} onUnblock={unblock} />
        ) : null}
      </List>
    </Host>
  );
}

function ReadySections({
  state,
  retryAction,
  onUnblock,
}: {
  state: Extract<BlockListState, { kind: 'ready' }>;
  retryAction: { label: string; onPress: () => void; testID: string };
  onUnblock: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      {state.refreshFailed ? (
        <NoticeCard
          tone="warning"
          icon="exclamationmark.triangle.fill"
          title={t('bounty.block.list.refreshFailed')}
          action={retryAction}
          testID="blocked-stale"
        />
      ) : null}
      {state.unblockFailed ? (
        <NoticeCard
          tone="urgent"
          icon="exclamationmark.circle.fill"
          title={t('bounty.block.list.unblockFailed')}
          testID="blocked-unblock-failed"
        />
      ) : null}
      {state.people.length === 0 ? (
        <Section>
          <VStack
            alignment="leading"
            spacing={vars['--space-1']}
            modifiers={[accessibilityElement('combine'), accessibilityIdentifier('blocked-empty')]}
          >
            <Text modifiers={[font({ textStyle: 'headline' })]}>
              {t('bounty.block.list.emptyTitle')}
            </Text>
            <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>
              {t('bounty.block.list.emptyBody')}
            </Text>
          </VStack>
        </Section>
      ) : (
        <Section footer={<Text>{t('bounty.block.list.footer')}</Text>}>
          {state.people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              unblocking={state.unblocking.includes(person.id)}
              onUnblock={() => onUnblock(person.id)}
            />
          ))}
        </Section>
      )}
    </>
  );
}

function PersonRow({
  person,
  unblocking,
  onUnblock,
}: {
  person: BlockedPerson;
  unblocking: boolean;
  onUnblock: () => void;
}) {
  const { t } = useI18n();
  const name = person.name ?? t('bounty.post.unknownName');
  if (unblocking) {
    return (
      <HStack spacing={vars['--space-3']} modifiers={[frame({ minHeight: vars['--touch-min'] })]}>
        <Text modifiers={[accessibilityIdentifier(`blocked-row-${person.id}`)]}>{name}</Text>
        <Spacer />
        <ProgressView
          modifiers={[
            accessibilityLabel(t('bounty.block.list.unblocking')),
            accessibilityIdentifier(`blocked-unblocking-${person.id}`),
          ]}
        />
      </HStack>
    );
  }
  return (
    <SwipeActions>
      <HStack
        spacing={vars['--space-3']}
        modifiers={[
          frame({ minHeight: vars['--touch-min'] }),
          accessibilityElement('combine'),
          accessibilityIdentifier(`blocked-row-${person.id}`),
        ]}
      >
        <Text>{name}</Text>
        <Spacer />
      </HStack>
      <SwipeActions.Actions edge="trailing">
        <Button role="destructive" label={t('bounty.block.list.unblock')} onPress={onUnblock} />
      </SwipeActions.Actions>
    </SwipeActions>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
