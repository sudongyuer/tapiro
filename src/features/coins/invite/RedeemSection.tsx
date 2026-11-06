import { Button, HStack, ProgressView, Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  autocorrectionDisabled,
  buttonStyle,
  contentShape,
  disabled,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  onSubmit,
  shapes,
  submitLabel,
  textInputAutocapitalization,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { RedeemState } from '../coinsStore';
import { coinsStore } from '../services';
import { SAMPLE_CODE } from './inviteView';

const CODE_MAX = 12;

export function RedeemSection({ redeem }: { redeem: RedeemState }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [typed, setTyped] = useState(() => coinsStore.codeDraft());
  const field = useSyncedText(typed, (text) => {
    setTyped(text);
    coinsStore.saveCodeDraft(text);
    coinsStore.dismissRedeemFailure();
  });
  const sending = redeem.phase === 'sending';
  const empty = typed.trim().length === 0;
  const send = () => {
    const code = field.sync();
    if (code.trim().length === 0 || sending) return;
    void coinsStore.redeem(code);
  };
  const error = redeem.phase === 'failed' ? t(`coins.invite.error.${redeem.failure}`) : null;
  return (
    <Section
      title={t('coins.invite.enterCode')}
      footer={
        error ? (
          <Text
            modifiers={[
              font({ textStyle: 'footnote' }),
              foregroundStyle(color('--color-urgent')),
              accessibilityIdentifier('invite-error'),
            ]}
          >
            {error}
          </Text>
        ) : undefined
      }
    >
      <HStack spacing={vars['--space-3']}>
        <SyncedTextField
          field={field}
          maxLength={CODE_MAX}
          placeholder={t('coins.invite.placeholder', { code: SAMPLE_CODE })}
          testID="invite-code-field"
          modifiers={[
            font({ textStyle: 'body', design: 'monospaced' }),
            textInputAutocapitalization('characters'),
            autocorrectionDisabled(),
            keyboardType('ascii-capable'),
            submitLabel('done'),
            onSubmit(send),
            disabled(sending),
            accessibilityLabel(t('coins.invite.enterCode')),
          ]}
        />
        {sending ? (
          <ProgressView
            modifiers={[
              accessibilityLabel(t('coins.invite.sending')),
              accessibilityIdentifier('invite-sending'),
              frame({ minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] }),
            ]}
          />
        ) : (
          <Button
            onPress={send}
            testID="invite-submit"
            modifiers={[
              buttonStyle('borderless'),
              disabled(empty),
              accessibilityLabel(t('coins.invite.submit')),
              accessibilityIdentifier('invite-submit'),
            ]}
          >
            <Text
              modifiers={[
                frame({ minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] }),
                contentShape(shapes.rectangle()),
              ]}
            >
              {t('coins.invite.submit')}
            </Text>
          </Button>
        )}
      </HStack>
    </Section>
  );
}
