import { Form, Host, Section, Text } from '@expo/ui/swift-ui';
import {
  autocorrectionDisabled,
  keyboardType,
  textContentType,
  textInputAutocapitalization,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { useTheme } from '@/ui/theme/useTheme';

import { LoadStateForm } from './LoadState';
import { NoticeCard } from '@/ui/NoticeCard';
import { EditActions, SheetChrome } from './SheetChrome';
import { useMethodEditor } from './useMethodEditor';
import {
  checkMalaysianMobile,
  checkPayeeName,
  formatMalaysianMobile,
  PAYEE_NAME_MAX,
} from './validate';

type PhoneError = 'phoneEmpty' | 'phoneInvalid' | 'nameEmpty' | 'nameInvalid' | 'saveFailed';

export function PhoneSheet({
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
  const initial = editor.existing?.type === 'duitnow_id' ? editor.existing : null;
  if (editor.pending)
    return (
      <>
        <SheetChrome title={t('payee.types.duitnow_id')} onClose={onDone} />
        <LoadStateForm status={editor.pending} onRetry={editor.retry} />
      </>
    );
  return (
    <PhoneForm
      key={initial?.id ?? 'new'}
      initialPhone={initial ? formatMalaysianMobile(initial.phone) : ''}
      initialName={initial?.displayName ?? ''}
      editor={editor}
      onClose={onDone}
    />
  );
}

function PhoneForm({
  initialPhone,
  initialName,
  editor,
  onClose,
}: {
  initialPhone: string;
  initialName: string;
  editor: ReturnType<typeof useMethodEditor>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [error, setError] = useState<PhoneError | null>(null);
  const clearErrors = () => {
    setError(null);
    editor.clearSaveFailed();
  };
  const phoneText = useSyncedText(initialPhone, clearErrors);
  const nameText = useSyncedText(initialName, clearErrors);
  const shown = error ?? (editor.saveFailed ? 'saveFailed' : null);

  function submit() {
    const checkedPhone = checkMalaysianMobile(phoneText.sync());
    if (!checkedPhone.ok)
      return setError(checkedPhone.reason === 'empty' ? 'phoneEmpty' : 'phoneInvalid');
    const checkedName = checkPayeeName(nameText.sync());
    if (!checkedName.ok)
      return setError(checkedName.reason === 'empty' ? 'nameEmpty' : 'nameInvalid');
    setError(null);
    editor.save({ type: 'duitnow_id', phone: checkedPhone.value, displayName: checkedName.value });
  }

  return (
    <Host style={styles.host} testID="payee-phone-sheet">
      <SheetChrome title={t('payee.types.duitnow_id')} onClose={onClose} onSave={submit} />
      <Form modifiers={[tint(color('--color-accent'))]}>
        {shown ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t(`payee.form.error.${shown}`)}
            testID="payee-form-error"
          />
        ) : null}
        <Section title={t('payee.form.phoneLabel')}>
          <SyncedTextField
            field={phoneText}
            placeholder={t('payee.form.phonePlaceholder')}
            testID="payee-phone-input"
            modifiers={[keyboardType('phone-pad'), textContentType('telephoneNumber')]}
          />
        </Section>
        <Section
          title={t('payee.form.nameLabel')}
          footer={<Text>{t('payee.form.nameFooter')}</Text>}
        >
          <SyncedTextField
            field={nameText}
            maxLength={PAYEE_NAME_MAX}
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
