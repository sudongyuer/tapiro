import { useEffect, useRef, useState } from 'react';

import { classifyFirst, type ClassifiedQr, type QrRejection } from './classifyQr';
import { isQrMethod, samePayload, type PayeeDetails, type PayeeMethod } from './methods';
import { QrConfirmForm, QrPickForm, type QrError } from './QrForms';
import { qrSource } from './services';
import type { ScanStart } from './qrSource';
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
  repick = false,
  onDone,
}: {
  userId: string;
  methodId?: string;
  repick?: boolean;
  onDone: () => void;
}) {
  const editor = useMethodEditor(userId, methodId, onDone);
  const [picked, setPicked] = useState<ClassifiedQr | null>(null);
  const [error, setError] = useState<QrError | null>(null);
  const [showPicker, setShowPicker] = useState(repick);
  const stopScan = useRef<(() => void) | null>(null);
  const current = showPicker ? null : (picked ?? toQr(editor.existing));

  useEffect(() => () => stopScan.current?.(), []);

  function accept(payloads: string[]) {
    const result = classifyFirst(payloads);
    if (result.ok) {
      setError(null);
      setPicked(result.qr);
      setShowPicker(false);
    } else {
      setError(result.reason satisfies QrRejection);
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
    const started: ScanStart = await qrSource.startScan(accept);
    if (started.status === 'started') stopScan.current = started.stop;
    else setError(started.status);
  }

  function save() {
    if (!current) return;
    const details = toDetails(current);
    const target = editor.existing ?? samePayload(editor.methods, current.payload);
    if (target) editor.update(target.id, details);
    else editor.save(details);
  }

  const shownError = error ?? (editor.saveFailed ? 'saveFailed' : null);

  if (current)
    return (
      <QrConfirmForm
        qr={current}
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
  return <QrPickForm error={shownError} onClose={onDone} onPick={pick} onScan={scan} />;
}
