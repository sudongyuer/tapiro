import { useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/lib/i18n';

import { classifyFirst, type ClassifiedQr } from './classifyQr';
import { methodTitle, walletOf, type QrWallet } from './display';
import { LoadStateForm } from './LoadState';
import { isQrMethod, samePayload, type PayeeDetails, type PayeeMethod } from './methods';
import { QrConfirmForm, QrPickForm, type QrError } from './QrForms';
import { qrSource } from './services';
import { SheetChrome } from './SheetChrome';
import { useMethodEditor } from './useMethodEditor';

function toQr(method: PayeeMethod | null): ClassifiedQr | null {
  if (!method || !isQrMethod(method)) return null;
  if (method.type === 'duitnow_qr')
    return { ...method, type: 'duitnow_qr', business: method.mcc !== '0000' };
  if (method.type === 'alipay' || method.type === 'wechat')
    return { type: method.type, payload: method.payload };
  return null;
}

function toDetails(qr: ClassifiedQr): PayeeDetails {
  if (qr.type === 'duitnow_qr') {
    const { payload, acquirerId, mcc, name } = qr;
    return { type: qr.type, payload, acquirerId, mcc, name };
  }
  return { type: qr.type, payload: qr.payload };
}

export function QrSheet({
  userId,
  methodId,
  wallet,
  repick = false,
  onDone,
}: {
  userId: string;
  methodId?: string;
  wallet?: QrWallet;
  repick?: boolean;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const editor = useMethodEditor(userId, methodId, onDone);
  const [, requestCamera] = useCameraPermissions();
  const [picked, setPicked] = useState<ClassifiedQr | null>(null);
  const [error, setError] = useState<QrError | null>(null);
  const [showPicker, setShowPicker] = useState(repick);
  const stopScan = useRef<(() => void) | null>(null);
  const current = showPicker ? null : (picked ?? toQr(editor.existing));
  const expected = wallet ?? (editor.existing ? walletOfMethod(editor.existing) : undefined);
  const title = wallet ? t(`payee.types.${wallet}`) : t('payee.qr.title');

  useEffect(() => () => stopScan.current?.(), []);

  if (editor.pending)
    return (
      <>
        <SheetChrome title={title} onClose={onDone} />
        <LoadStateForm status={editor.pending} onRetry={editor.retry} />
      </>
    );

  function accept(payloads: string[]) {
    const result = classifyFirst(payloads);
    if (result.ok) {
      setError(null);
      setPicked(result.qr);
      setShowPicker(false);
    } else {
      setError(result.reason);
    }
  }

  async function pick() {
    setError(null);
    const result = await qrSource.pickScreenshot();
    if (result.status === 'decoded') accept(result.payloads);
    else if (result.status === 'failed') setError('failed');
  }

  async function scan() {
    setError(null);
    stopScan.current?.();
    const started = await qrSource.startScan(requestCamera, accept);
    if (started.status === 'started') stopScan.current = started.stop;
    else setError(started.status);
  }

  function save() {
    if (!current) return;
    editor.write(
      editor.existing ?? samePayload(editor.methods, current.payload),
      toDetails(current),
    );
  }

  const shownError = error ?? (editor.saveFailed ? 'saveFailed' : null);

  if (current) {
    const detected = walletOf(current);
    const mismatch = picked && expected && detected !== expected ? current : null;
    return (
      <QrConfirmForm
        title={mismatch ? methodTitle(t, current) : title}
        qr={current}
        mismatch={mismatch}
        error={shownError}
        existing={picked ? null : editor.existing}
        onClose={onDone}
        onSave={save}
        onRetry={() => {
          setError(null);
          setPicked(null);
          setShowPicker(true);
        }}
        onMakeDefault={editor.makeDefault}
        onDelete={editor.remove}
      />
    );
  }
  return (
    <QrPickForm
      title={title}
      wallet={wallet}
      error={shownError}
      onClose={onDone}
      onPick={pick}
      onScan={scan}
    />
  );
}

function walletOfMethod(method: PayeeMethod) {
  const qr = toQr(method);
  if (!qr) return undefined;
  const wallet = walletOf(qr);
  return wallet === 'duitnow' ? undefined : wallet;
}
