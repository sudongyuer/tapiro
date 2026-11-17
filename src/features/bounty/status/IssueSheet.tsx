import {
  BottomSheet,
  Button,
  Form,
  Group,
  Host,
  HStack,
  NavigationStack,
  Section,
  Text,
  Toolbar,
  ToolbarItem,
} from '@expo/ui/swift-ui';
import {
  accessibilityHint,
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  disabled,
  fixedSize,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  navigationBarTitleDisplayMode,
  navigationTitle,
  presentationDetents,
  presentationDragIndicator,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { afterResign } from '@/ui/afterResign';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { issueCount, issueReady } from './actionCopy';
import { issueDrafts } from './services';
import { ISSUE_REASON_MAX } from './types';

export function IssueSheet({
  bountyId,
  open,
  name,
  onSend: sent,
  onClose: closed,
}: {
  bountyId: string;
  open: boolean;
  name: string;
  onSend: (reason: string) => void;
  onClose: () => void;
}) {
  const onSend = afterResign(sent);
  const onClose = afterResign(closed);
  return (
    <Host matchContents style={styles.anchor}>
      <BottomSheet
        isPresented={open}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose();
        }}
      >
        <Group modifiers={[presentationDetents(['large']), presentationDragIndicator('visible')]}>
          {open ? (
            <IssueForm bountyId={bountyId} name={name} onSend={onSend} onClose={onClose} />
          ) : null}
        </Group>
      </BottomSheet>
    </Host>
  );
}

function IssueForm({
  bountyId,
  name,
  onSend,
  onClose,
}: {
  bountyId: string;
  name: string;
  onSend: (reason: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [typed, setTyped] = useState(() => issueDrafts.get(bountyId));
  const reason = useSyncedText(typed, (text) => {
    issueDrafts.set(bountyId, text);
    setTyped(text);
  });
  const count = issueCount(typed);
  const ready = issueReady(typed);
  const send = () => {
    const text = reason.sync();
    if (issueReady(text)) onSend(text);
  };
  return (
    <NavigationStack>
      <Toolbar>
        <Form
          modifiers={[
            navigationTitle(t('bounty.issue.title', { name })),
            navigationBarTitleDisplayMode('inline'),
          ]}
        >
          <Section
            footer={
              <HStack alignment="top" spacing={vars['--space-2']}>
                <Text modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
                  {t('bounty.issue.footer', { name })}
                </Text>
                <Text
                  modifiers={[
                    ...(count > ISSUE_REASON_MAX ? [foregroundStyle(color('--color-urgent'))] : []),
                    monospacedDigit(),
                    fixedSize(),
                    accessibilityLabel(
                      t('bounty.issue.countLabel', { count, max: ISSUE_REASON_MAX }),
                    ),
                    accessibilityIdentifier('bounty-issue-count'),
                  ]}
                >
                  {t('bounty.issue.count', { count, max: ISSUE_REASON_MAX })}
                </Text>
              </HStack>
            }
          >
            <SyncedTextField
              field={reason}
              axis="vertical"
              autoFocus
              maxLength={ISSUE_REASON_MAX}
              placeholder={t('bounty.issue.placeholder')}
              testID="bounty-issue-reason"
              modifiers={[
                lineLimit({ min: 4, max: 8 }),
                accessibilityLabel(t('bounty.issue.title', { name })),
              ]}
            />
          </Section>
        </Form>
        <Toolbar.Content>
          <ToolbarItem placement="cancellationAction">
            <Button
              label={t('bounty.issue.cancel')}
              onPress={onClose}
              modifiers={[accessibilityIdentifier('bounty-issue-cancel')]}
            />
          </ToolbarItem>
          <ToolbarItem placement="confirmationAction">
            <Button
              label={t('bounty.issue.send')}
              onPress={send}
              modifiers={[
                buttonStyle('glassProminent'),
                tint(color('--color-accent')),
                disabled(!ready),
                ...(count === 0 ? [accessibilityHint(t('bounty.issue.empty'))] : []),
                accessibilityIdentifier('bounty-issue-send'),
              ]}
            />
          </ToolbarItem>
        </Toolbar.Content>
      </Toolbar>
    </NavigationStack>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: 0, height: 0 },
});
