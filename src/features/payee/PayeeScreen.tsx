import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';

import { METHOD_ICONS } from './display';
import { usePayeeMethods } from './hooks';
import { hasCash, type PayeeMethod } from './methods';
import { PayeeListView } from './PayeeListView';
import { payeeStore } from './services';

export type PayeeSheet = 'phone' | 'bank' | 'qr';

const SHEET_FOR: Record<PayeeMethod['type'], PayeeSheet | null> = {
  duitnow_id: 'phone',
  bank_account: 'bank',
  duitnow_qr: 'qr',
  alipay: 'qr',
  wechat: 'qr',
  cash: null,
};

export function PayeeScreen({
  userId,
  onOpen,
}: {
  userId: string;
  onOpen: (sheet: PayeeSheet, options?: { id: string; repick?: boolean }) => void;
}) {
  const { t } = useI18n();
  const { methods } = usePayeeMethods(userId);
  const cashOn = hasCash(methods);

  function setCash(on: boolean) {
    const cash = methods.find((method) => method.type === 'cash');
    if (on && !cash) payeeStore.add(userId, { type: 'cash' });
    if (!on && cash) payeeStore.remove(userId, cash.id);
  }

  function edit(method: PayeeMethod) {
    const sheet = SHEET_FOR[method.type];
    if (sheet) onOpen(sheet, { id: method.id });
  }

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus" accessibilityLabel={t('payee.add')}>
          <Stack.Toolbar.MenuAction icon={METHOD_ICONS.duitnow_id} onPress={() => onOpen('phone')}>
            {t('payee.types.duitnow_id')}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon={METHOD_ICONS.bank_account} onPress={() => onOpen('bank')}>
            {t('payee.types.bank_account')}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="qrcode" onPress={() => onOpen('qr')}>
            {t('payee.types.qr')}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon={METHOD_ICONS.cash}
            hidden={cashOn}
            onPress={() => setCash(true)}
          >
            {t('payee.types.cash')}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <PayeeListView
        methods={methods}
        now={new Date()}
        onEdit={edit}
        onRemove={(method) => payeeStore.remove(userId, method.id)}
        onRecheck={(method) => onOpen('qr', { id: method.id, repick: true })}
        onCashChange={setCash}
      />
    </>
  );
}
