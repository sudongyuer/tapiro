import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { localClock } from '@/lib/deviceClock';
import { useI18n } from '@/lib/i18n';
import { useOffline } from '@/lib/network';
import { stickerStore } from '@/lib/stickers';
import { NoticeCard } from '@/ui/NoticeCard';
import { OfflineSection } from '@/ui/OfflineLine';

import { Celebration, type CelebrationData } from './celebration/Celebration';
import { TextSection } from './formParts';
import { celebrationNote, paidAmount } from './amounts';
import { usePaymentList, usePaySheet } from './hooks';
import type { Proof } from './ProofSection';
import { SheetFrame } from '@/ui/SheetFrame';
import { SheetBody, type Remind } from './SheetBody';
import { celebratesSettle, sheetTitleKey } from './stateMachine';

export type { Remind } from './SheetBody';

export function PaySheet({
  userId,
  paymentId,
  onClose,
  onOpenStickerBook,
  remind,
}: {
  userId: string;
  paymentId: string;
  onClose: () => void;
  onOpenStickerBook: () => void;
  remind: Remind;
}) {
  const { t } = useI18n();
  const sheet = usePaySheet(userId, paymentId);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const { state } = sheet;
  const listed = usePaymentList();
  const cached =
    listed.status === 'idle' ? undefined : listed.payments.find(({ id }) => id === paymentId);
  const role = state.status === 'ready' ? state.payment.role : (cached?.role ?? null);
  const itemKind = state.status === 'ready' ? state.payment.itemKind : (cached?.itemKind ?? null);
  const titleKey = sheetTitleKey(role, itemKind);
  const offline = useOffline();
  const wasOffline = useRef(offline);
  const { refresh } = sheet;
  useEffect(() => {
    if (wasOffline.current && !offline) refresh();
    wasOffline.current = offline;
  }, [offline, refresh]);
  const notice = offline ? (
    <NoticeCard
      tone="warning"
      icon="wifi.slash"
      title={t('pay.sheet.offline.title')}
      body={t('pay.sheet.offline.body')}
      testID="pay-offline"
    />
  ) : sheet.failed ? (
    <NoticeCard
      tone="urgent"
      icon="exclamationmark.circle.fill"
      title={t(sheet.failed === 'amountChanged' ? 'pay.sheet.amountChanged' : 'pay.sheet.failed')}
      testID="pay-failed"
    />
  ) : state.status === 'ready' && state.refreshFailed ? (
    <OfflineSection
      text={t('live.staleAt', { time: localClock(state.loadedAt) })}
      testID="pay-stale"
    />
  ) : null;

  useEffect(() => {
    stickerStore.ensureLoaded(userId);
  }, [userId]);

  async function confirm() {
    if (state.status !== 'ready') return;
    const { payment, detail } = state;
    const known = stickerStore.getSnapshot();
    const previous = known.status === 'ready' && known.userId === userId ? known.stickers : null;
    const result = await sheet.confirm();
    if (!result) return;
    stickerStore.reload(userId);
    if (payment.reverses !== null || !celebratesSettle(payment.itemKind, result)) return;
    setCelebration({
      first: result.firstSettled,
      count: result.stickerCount,
      previous,
      title: payment.title,
      name: payment.counterpartName,
      amount: paidAmount(payment),
      note: celebrationNote(payment, detail.rate),
      itemKind: payment.itemKind,
      category: payment.category,
      art: detail.art,
    });
  }

  // An uploaded proof keeps its path, so a failed 我已付款 is retried with the same file instead of a new upload.
  async function markPaid(methodId: string, proof: Proof, setProof: (next: Proof) => void) {
    let path: string | null = proof.status === 'uploaded' ? proof.path : null;
    if (proof.status === 'picked' || proof.status === 'failed') {
      setProof({ status: 'uploading', uri: proof.uri });
      try {
        path = await sheet.uploadProof(proof.uri);
      } catch {
        setProof({ status: 'failed', uri: proof.uri });
        return;
      }
      setProof({ status: 'uploaded', uri: proof.uri, path });
    }
    if (state.status !== 'ready') return;
    await sheet.markPaid(methodId, path, state.payment.amount.minor);
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: titleKey ? t(titleKey) : '' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('pay.sheet.close')}
          onPress={onClose}
        />
      </Stack.Toolbar>
      <SheetFrame notice={notice} testID="pay-sheet">
        {state.status === 'loading' ? (
          <TextSection title={t('pay.sheet.loading')} testID="pay-loading" />
        ) : state.status === 'missing' ? (
          <NoticeCard
            tone="warning"
            icon="questionmark.circle.fill"
            title={t('pay.sheet.missing')}
            testID="pay-missing"
          />
        ) : state.status === 'failed' ? (
          <NoticeCard
            tone="urgent"
            icon="wifi.exclamationmark"
            title={t('pay.sheet.loadFailed.title')}
            body={t('pay.sheet.loadFailed.body')}
            action={{ label: t('pay.sheet.retry'), onPress: sheet.retry, testID: 'pay-retry' }}
            testID="pay-load-failed"
          />
        ) : (
          <SheetBody
            data={state}
            sheet={sheet}
            onConfirm={confirm}
            onMarkPaid={markPaid}
            remind={remind}
            offline={offline}
          />
        )}
      </SheetFrame>
      {celebration ? (
        <Celebration
          data={celebration}
          onDone={() => setCelebration(null)}
          onOpenBook={() => {
            setCelebration(null);
            onOpenStickerBook();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
