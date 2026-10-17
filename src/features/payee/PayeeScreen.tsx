import { Stack } from 'expo-router';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';

import { METHOD_ICONS, type QrWallet } from './display';
import { usePayeeMethods } from './hooks';
import { hasCash, type PayeeMethod } from './methods';
import { PayeeListView } from './PayeeListView';
import { payeeStore } from './services';

export type PayeeSheet = 'phone' | 'bank' | 'qr';
export type PayeeSheetOptions = { id?: string; repick?: boolean; wallet?: QrWallet };

const SHEET_FOR: Record<PayeeMethod['type'], PayeeSheet | null> = {
  duitnow_id: 'phone',
  bank_account: 'bank',
  duitnow_qr: 'qr',
  alipay: 'qr',
  wechat: 'qr',
  cash: null,
};

const WALLETS: readonly QrWallet[] = ['alipay', 'wechat', 'tng'];

export function PayeeScreen({
  userId,
  onOpen,
}: {
  userId: string;
  onOpen: (sheet: PayeeSheet, options?: PayeeSheetOptions) => void;
}) {
  const { t } = useI18n();
  const { status, methods } = usePayeeMethods(userId);
  const [actionFailed, setActionFailed] = useState(false);
  const cashOn = hasCash(methods);

  async function act(change: () => Promise<boolean>) {
    setActionFailed(false);
    setActionFailed(!(await change()));
  }

  function setCash(on: boolean) {
    const cash = methods.find((method) => method.type === 'cash');
    if (on && !cash) act(() => payeeStore.add(userId, { type: 'cash' }));
    if (!on && cash) act(() => payeeStore.remove(userId, cash.id));
  }

  function edit(method: PayeeMethod) {
    const sheet = SHEET_FOR[method.type];
    if (sheet) onOpen(sheet, { id: method.id });
  }

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon="plus"
          accessibilityLabel={t('payee.add')}
          disabled={status !== 'ready'}
        >
          {WALLETS.map((wallet) => (
            <Stack.Toolbar.MenuAction
              key={wallet}
              icon="qrcode"
              onPress={() => onOpen('qr', { wallet })}
            >
              {t(`payee.types.${wallet}`)}
            </Stack.Toolbar.MenuAction>
          ))}
          <Stack.Toolbar.Menu inline title={t('payee.menuOther')}>
            <Stack.Toolbar.MenuAction
              icon={METHOD_ICONS.duitnow_id}
              onPress={() => onOpen('phone')}
            >
              {t('payee.types.duitnow_id')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon={METHOD_ICONS.bank_account}
              onPress={() => onOpen('bank')}
            >
              {t('payee.types.bank_account')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon={METHOD_ICONS.cash}
              hidden={cashOn}
              onPress={() => setCash(true)}
            >
              {t('payee.types.cash')}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <PayeeListView
        status={status}
        methods={methods}
        now={new Date()}
        actionFailed={actionFailed}
        onRetry={() => payeeStore.ensureLoaded(userId)}
        onEdit={edit}
        onRemove={(method) => act(() => payeeStore.remove(userId, method.id))}
        onRecheck={(method) => onOpen('qr', { id: method.id, repick: true })}
        onCashChange={setCash}
      />
    </>
  );
}
