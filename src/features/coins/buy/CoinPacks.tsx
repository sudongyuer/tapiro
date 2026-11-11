import {
  Button,
  HStack,
  Image,
  ProgressView,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  font,
  foregroundStyle,
  monospacedDigit,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect } from 'react';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useOnCredited, usePurchase } from '../purchase/hooks';
import { purchaseBusy } from '../purchase/purchaseStore';
import type { Pack, PurchasePhase } from '../purchase/types';
import { purchaseStore } from '../services';
import { CoinMark } from './CoinMark';
import { purchaseLine, type PurchaseLine } from './purchaseLine';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function CoinPacks({
  testID,
  footer,
  onCredited,
}: {
  testID: string;
  footer?: string;
  onCredited?: () => void;
}) {
  const { t } = useI18n();
  const packs = usePurchase((state) => state.packs);
  const purchase = usePurchase((state) => state.purchase);
  useOnCredited(onCredited);
  useEffect(() => {
    purchaseStore.dismiss();
    purchaseStore.openPacks();
  }, []);
  const list = packs.status === 'idle' ? null : packs.data;
  const footerText = footer ? <Text>{footer}</Text> : undefined;
  if (packs.status === 'failed' || (packs.status === 'stale' && list === null)) {
    return (
      <Section footer={footerText}>
        <Text modifiers={[secondary, accessibilityIdentifier(`${testID}-failed`)]}>
          {t('coins.buy.failed')}
        </Text>
        <Button
          label={t('coins.buy.retry')}
          onPress={() => void purchaseStore.loadPacks()}
          testID={`${testID}-retry`}
        />
      </Section>
    );
  }
  if (list === null) {
    return (
      <Section footer={footerText}>
        <ProgressView
          modifiers={[
            accessibilityLabel(t('coins.buy.loading')),
            accessibilityIdentifier(`${testID}-loading`),
          ]}
        />
      </Section>
    );
  }
  return (
    <>
      <Section footer={footerText}>
        {list.length === 0 ? (
          <Text modifiers={[secondary, accessibilityIdentifier(`${testID}-empty`)]}>
            {t('coins.buy.empty')}
          </Text>
        ) : (
          list.map((pack) => (
            <PackRow key={pack.productId} pack={pack} purchase={purchase} testID={testID} />
          ))
        )}
      </Section>
      <PurchaseStatus testID={testID} />
    </>
  );
}

function PackRow({
  pack,
  purchase,
  testID,
}: {
  pack: Pack;
  purchase: PurchasePhase;
  testID: string;
}) {
  const { t } = useI18n();
  const busy = purchaseBusy(purchase);
  const here = busy && 'productId' in purchase && purchase.productId === pack.productId;
  const name = t('coins.buy.pack', { coins: pack.coins });
  return (
    <HStack
      spacing={vars['--space-3']}
      modifiers={[accessibilityIdentifier(`${testID}-pack-${pack.coins}`)]}
    >
      <CoinMark />
      <Text
        modifiers={[
          font({ textStyle: 'body', weight: 'semibold', design: 'rounded' }),
          monospacedDigit(),
          accessibilityHidden(),
        ]}
      >
        {name}
      </Text>
      <Spacer />
      {here ? (
        <ProgressView
          modifiers={[
            accessibilityLabel(t('coins.buy.buying')),
            accessibilityIdentifier(`${testID}-busy-${pack.coins}`),
          ]}
        />
      ) : (
        <Button
          label={pack.price}
          onPress={() => void purchaseStore.buy(pack.productId)}
          testID={`${testID}-buy-${pack.coins}`}
          modifiers={[
            buttonStyle('bordered'),
            buttonBorderShape('capsule'),
            controlSize('large'),
            font({ textStyle: 'subheadline', weight: 'semibold' }),
            monospacedDigit(),
            accessibilityLabel(t('coins.buy.packA11y', { coins: pack.coins, price: pack.price })),
            disabled(busy),
          ]}
        />
      )}
    </HStack>
  );
}

function PurchaseStatus({ testID }: { testID: string }) {
  const purchase = usePurchase((state) => state.purchase);
  const kept = usePurchase((state) => state.kept.length);
  const line =
    purchaseLine(purchase) ??
    (kept > 0 ? purchaseLine({ phase: 'processing', productId: '' }) : null);
  if (!line) return null;
  const coins = purchase.phase === 'succeeded' ? purchase.coins : 0;
  return (
    <Section>
      <StatusLine line={line} coins={coins} testID={`${testID}-status`} />
      {line.key === 'coins.buy.processing' ? <RecheckButton testID={`${testID}-recheck`} /> : null}
    </Section>
  );
}

export function PurchaseWaiting({ testID }: { testID: string }) {
  const purchase = usePurchase((state) => state.purchase);
  const kept = usePurchase((state) => state.kept.length);
  const waiting =
    purchase.phase === 'pending' || purchase.phase === 'processing'
      ? purchase
      : kept > 0
        ? ({ phase: 'processing', productId: '' } as const)
        : null;
  const line = waiting ? purchaseLine(waiting) : null;
  if (!line) return null;
  return (
    <Section>
      <StatusLine line={line} coins={0} testID={`${testID}-status`} />
      {line.key === 'coins.buy.processing' ? <RecheckButton testID={`${testID}-recheck`} /> : null}
    </Section>
  );
}

const TONE_COLOR = {
  success: '--color-success',
  urgent: '--color-urgent',
  waiting: '--color-accent',
  progress: '--color-accent',
} as const;

function StatusLine({
  line,
  coins,
  testID,
}: {
  line: PurchaseLine;
  coins: number;
  testID: string;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const tint = color(TONE_COLOR[line.tone]);
  return (
    <HStack
      alignment="top"
      spacing={vars['--space-3']}
      modifiers={[accessibilityElement('combine'), accessibilityIdentifier(testID)]}
    >
      {line.icon ? (
        <Image
          systemName={line.icon}
          size={20}
          modifiers={[foregroundStyle(tint), accessibilityHidden()]}
        />
      ) : (
        <ProgressView />
      )}
      <VStack alignment="leading" spacing={vars['--space-1']}>
        <Text modifiers={[font({ textStyle: 'headline' }), foregroundStyle(tint)]}>
          {t(line.key, { coins })}
        </Text>
        {line.body ? (
          <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>{t(line.body)}</Text>
        ) : null}
      </VStack>
    </HStack>
  );
}

export function RecheckButton({ testID }: { testID: string }) {
  const { t } = useI18n();
  const rechecking = usePurchase((state) => state.rechecking);
  if (rechecking) {
    return (
      <ProgressView
        modifiers={[
          accessibilityLabel(t('coins.buy.rechecking')),
          accessibilityIdentifier(`${testID}-busy`),
        ]}
      />
    );
  }
  return (
    <Button
      label={t('coins.buy.recheck')}
      onPress={() => void purchaseStore.recheck()}
      testID={testID}
    />
  );
}
