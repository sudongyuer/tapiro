import { Form, Host, Picker, Section, Text, TextField, useNativeState } from '@expo/ui/swift-ui';
import {
  autocorrectionDisabled,
  keyboardType,
  pickerStyle,
  tag,
  textContentType,
  textInputAutocapitalization,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

import { BANKS } from './acquirers';
import { NoticeCard } from './NoticeCard';
import { EditActions, SheetChrome } from './SheetChrome';
import { useMethodEditor } from './useMethodEditor';
import { checkAccountNumber, checkBank, checkPayeeName, PAYEE_NAME_MAX } from './validate';

type BankError =
  'bankEmpty' | 'accountEmpty' | 'accountInvalid' | 'nameEmpty' | 'nameInvalid' | 'saveFailed';

export function BankSheet({
  userId,
  methodId,
  onDone,
}: {
  userId: string;
  methodId?: string;
  onDone: () => void;
}) {
  const editor = useMethodEditor(userId, methodId, onDone);
  const initial = editor.existing?.type === 'bank_account' ? editor.existing : null;
  return (
    <BankForm
      key={initial?.id ?? 'new'}
      initialBank={initial?.bankCode ?? ''}
      initialAccount={initial?.accountNumber ?? ''}
      initialName={initial?.displayName ?? ''}
      editor={editor}
      onClose={onDone}
    />
  );
}

function BankForm({
  initialBank,
  initialAccount,
  initialName,
  editor,
  onClose,
}: {
  initialBank: string;
  initialAccount: string;
  initialName: string;
  editor: ReturnType<typeof useMethodEditor>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const accountText = useNativeState(initialAccount);
  const nameText = useNativeState(initialName);
  const [bank, setBank] = useState(initialBank);
  const [error, setError] = useState<BankError | null>(null);
  const shown = error ?? (editor.saveFailed ? 'saveFailed' : null);

  function submit() {
    const checkedBank = checkBank(bank || null);
    if (!checkedBank.ok) return setError('bankEmpty');
    const checkedAccount = checkAccountNumber(accountText.get());
    if (!checkedAccount.ok)
      return setError(checkedAccount.reason === 'empty' ? 'accountEmpty' : 'accountInvalid');
    const checkedName = checkPayeeName(nameText.get());
    if (!checkedName.ok)
      return setError(checkedName.reason === 'empty' ? 'nameEmpty' : 'nameInvalid');
    setError(null);
    editor.save({
      type: 'bank_account',
      bankCode: checkedBank.value,
      accountNumber: checkedAccount.value,
      displayName: checkedName.value,
    });
  }

  return (
    <Host style={styles.host} testID="payee-bank-sheet">
      <SheetChrome title={t('payee.types.bank_account')} onClose={onClose} onSave={submit} />
      <Form modifiers={[tint(color('--color-accent'))]}>
        {shown ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t(`payee.form.error.${shown}`)}
            testID="payee-form-error"
          />
        ) : null}
        <Section footer={<Text>{t('payee.form.accountFooter')}</Text>}>
          <Picker
            label={t('payee.form.bankLabel')}
            selection={bank}
            onSelectionChange={(next: string) => {
              setBank(next);
              setError(null);
            }}
            testID="payee-bank-picker"
            modifiers={[pickerStyle('menu')]}
          >
            {bank === '' ? (
              <Text modifiers={[tag('')]}>{t('payee.form.bankPlaceholder')}</Text>
            ) : null}
            {BANKS.map((option) => (
              <Text key={option.id} modifiers={[tag(option.id)]}>
                {option.name}
              </Text>
            ))}
          </Picker>
          <TextField
            text={accountText}
            onTextChange={() => {
              setError(null);
              editor.clearSaveFailed();
            }}
            placeholder={t('payee.form.accountLabel')}
            testID="payee-account-input"
            modifiers={[keyboardType('numeric')]}
          />
        </Section>
        <Section
          title={t('payee.form.nameLabel')}
          footer={<Text>{t('payee.form.nameFooter')}</Text>}
        >
          <TextField
            text={nameText}
            maxLength={PAYEE_NAME_MAX}
            onTextChange={() => {
              setError(null);
              editor.clearSaveFailed();
            }}
            placeholder={t('payee.form.namePlaceholder')}
            testID="payee-name-input"
            modifiers={[
              textContentType('name'),
              textInputAutocapitalization('characters'),
              autocorrectionDisabled(),
            ]}
          />
        </Section>
        {editor.existing ? (
          <EditActions
            isDefault={editor.existing.isDefault}
            onMakeDefault={editor.makeDefault}
            onDelete={editor.remove}
          />
        ) : null}
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
