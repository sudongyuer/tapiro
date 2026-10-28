import { Button, ConfirmationDialog, Host, ProgressView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  contentShape,
  foregroundStyle,
  frame,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { SheetActions } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useWithdraw } from '../apply/useApply';

const ROW = frame({ maxWidth: Infinity, minHeight: vars['--touch-min'] });

export function AppliedActions({
  id,
  name,
  note,
  reload,
}: {
  id: string;
  name: string;
  note: string | null;
  reload: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { state, withdraw } = useWithdraw(id, reload);
  const [asking, setAsking] = useState(false);
  return (
    <SheetActions>
      <AppText
        variant="body"
        accessibilityRole="text"
        testID="bounty-detail-applied"
        style={styles.applied}
      >
        {t('bounty.detail.applied', { name })}
      </AppText>
      {note ? (
        <AppText
          variant="secondary"
          tone="secondaryLabel"
          numberOfLines={3}
          testID="bounty-detail-note"
          style={styles.centred}
        >
          {t('bounty.detail.yourNote', { note })}
        </AppText>
      ) : null}
      {state.kind === 'failed' ? (
        <AppText
          variant="secondary"
          accessibilityRole="alert"
          testID="bounty-detail-withdraw-failed"
          style={[styles.centred, { color: color('--color-urgent') }]}
        >
          {t('bounty.detail.withdrawFailed')}
        </AppText>
      ) : null}
      <Host matchContents={{ vertical: true }} style={styles.host}>
        {state.kind === 'busy' ? (
          <ProgressView
            modifiers={[
              ROW,
              accessibilityLabel(t('bounty.detail.withdrawing')),
              accessibilityIdentifier('bounty-detail-withdrawing'),
            ]}
          />
        ) : (
          <ConfirmationDialog
            title={t('bounty.detail.withdrawConfirm.title')}
            titleVisibility="visible"
            isPresented={asking}
            onIsPresentedChange={setAsking}
          >
            <ConfirmationDialog.Trigger>
              <Button
                role="destructive"
                onPress={() => setAsking(true)}
                testID="bounty-detail-withdraw"
                modifiers={[foregroundStyle(color('--color-urgent'))]}
              >
                <Text modifiers={[ROW, contentShape(shapes.rectangle())]}>
                  {t('bounty.detail.withdraw')}
                </Text>
              </Button>
            </ConfirmationDialog.Trigger>
            <ConfirmationDialog.Actions>
              <Button
                label={t('bounty.detail.withdrawConfirm.confirm')}
                role="destructive"
                onPress={() => void withdraw()}
              />
              <Button label={t('bounty.detail.withdrawConfirm.cancel')} role="cancel" />
            </ConfirmationDialog.Actions>
            <ConfirmationDialog.Message>
              <Text>{t('bounty.detail.withdrawConfirm.body', { name })}</Text>
            </ConfirmationDialog.Message>
          </ConfirmationDialog>
        )}
      </Host>
    </SheetActions>
  );
}

const styles = StyleSheet.create({
  applied: { fontWeight: '600', textAlign: 'center', paddingTop: vars['--space-3'] },
  centred: { textAlign: 'center' },
  host: { alignSelf: 'stretch' },
});
