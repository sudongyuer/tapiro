import { Form, Host, Picker, Section, Text, TextField, useNativeState } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
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

import { BANKS, OTHER_BANK } from '@/lib/acquirers';
import { LoadStateForm } from './LoadState';
import { NoticeCard } from '@/ui/NoticeCard';
import { EditActions, SheetChrome } from './SheetChrome';
import { useMethodEditor } from './useMethodEditor';
import { checkAccountNumber, checkBank, checkPayeeName, PAYEE_NAME_MAX } from './validate';

type BankError =
  | 'bankEmpty'
  | 'bankNameEmpty'
  | 'bankNameInvalid'
  | 'accountEmpty'
  | 'accountInvalid'
  | 'nameEmpty'
  | 'nameInvalid'
  | 'saveFailed';

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
  const { t } = useI18n();
  const initial = editor.existing?.type === 'bank_account' ? editor.existing : null;
  if (editor.pending)
    return (
      <>
        <SheetChrome title={t('payee.types.bank_account')} onClose={onDone} />
        <LoadStateForm status={editor.pending} onRetry={editor.retry} />
      </>
    );
  return (
    <BankForm
      key={initial?.id ?? 'new'}
      initialBank={initial ? (initial.bankCode ?? OTHER_BANK) : ''}
      initialBankName={initial?.bankName ?? ''}
      initialAccount={initial?.accountNumber ?? ''}
      initialName={initial?.displayName ?? ''}
      editor={editor}
      onClose={onDone}
    />
  );
}

function BankForm({
  initialBank,
  initialBankName,
  initialAccount,
  initialName,
  editor,
  onClose,
}: {
  initialBank: string;
  initialBankName: string;
  initialAccount: string;
  initialName: string;
  editor: ReturnType<typeof useMethodEditor>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const accountText = useNativeState(initialAccount);
  const nameText = useNativeState(initialName);
  const bankNameText = useNativeState(initialBankName);
  const [bank, setBank] = useState(initialBank);
  const [error, setError] = useState<BankError | null>(null);
  const shown = error ?? (editor.saveFailed ? 'saveFailed' : null);

  function submit() {
    const checkedBank = checkBank(bank || null, bankNameText.get());
    if (!checkedBank.ok)
      return setError(
        checkedBank.reason === 'nameEmpty'
          ? 'bankNameEmpty'
          : checkedBank.reason === 'nameInvalid'
            ? 'bankNameInvalid'
            : 'bankEmpty',
      );
    const checkedAccount = checkAccountNumber(accountText.get());
    if (!checkedAccount.ok)
      return setError(checkedAccount.reason === 'empty' ? 'accountEmpty' : 'accountInvalid');
    const checkedName = checkPayeeName(nameText.get());
    if (!checkedName.ok)
      return setError(checkedName.reason === 'empty' ? 'nameEmpty' : 'nameInvalid');
    setError(null);
    editor.save({
      type: 'bank_account',
      ...checkedBank.value,
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
            <Text modifiers={[tag(OTHER_BANK)]}>{t('payee.form.otherBank')}</Text>
          </Picker>
          {bank === OTHER_BANK ? (
            <TextField
              text={bankNameText}
              maxLength={PAYEE_NAME_MAX}
              onTextChange={() => {
                setError(null);
                editor.clearSaveFailed();
              }}
              placeholder={t('payee.form.bankNamePlaceholder')}
              testID="payee-bank-name-input"
              modifiers={[
                accessibilityLabel(t('payee.form.bankNameLabel')),
                autocorrectionDisabled(),
              ]}
            />
          ) : null}
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
