import { Button, HStack, ProgressView, RNHostView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  fixedSize,
  font,
  foregroundStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { nameInitial } from '@/lib/nameInitial';
import { Avatar } from '@/ui/Avatar';
import { TierMark } from '@/ui/TierMark';
import { vars } from '@/ui/theme/tokens';

import type { Person } from '../board/types';
import { tierName, tierRank } from '../shared/tierCopy';
import type { DetailLoad } from './applicantsController';
import { addressView, type AddressView } from './applicantsView';

const AVATAR = 36;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const wraps = fixedSize({ horizontal: false, vertical: true });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });

function HelperRow({ helper }: { helper: Person }) {
  const { t } = useI18n();
  const name = helper.name ?? t('bounty.post.unknownName');
  const tier = tierName(helper.tier, t);
  return (
    <HStack
      spacing={vars['--space-3']}
      modifiers={[
        fill,
        accessibilityElement('combine'),
        accessibilityIdentifier('bounty-select-done-row'),
      ]}
    >
      <RNHostView matchContents>
        <Avatar uri={null} size={AVATAR} label={name} initial={nameInitial(name)} />
      </RNHostView>
      <Text modifiers={[font({ textStyle: 'body', weight: 'semibold' }), wraps]}>{name}</Text>
      <TierMark label={tier} rank={tierRank(helper.tier)} />
    </HStack>
  );
}

function AddressRow({ address, onRetry }: { address: AddressView; onRetry: () => void }) {
  const { t } = useI18n();
  if (address.kind === 'loading') {
    return (
      <HStack spacing={vars['--space-2']} modifiers={[fill]}>
        <ProgressView
          modifiers={[
            accessibilityLabel(t('bounty.select.done.addressLoading')),
            accessibilityIdentifier('bounty-select-done-address-loading'),
          ]}
        />
        <Text modifiers={[secondary]}>{t('bounty.select.done.addressLoading')}</Text>
      </HStack>
    );
  }
  if (address.kind === 'failed') {
    return (
      <HStack spacing={vars['--space-2']} modifiers={[fill]}>
        <Text
          modifiers={[
            secondary,
            fill,
            wraps,
            accessibilityIdentifier('bounty-select-done-address-failed'),
          ]}
        >
          {t('bounty.select.done.addressFailed')}
        </Text>
        <Button
          label={t('bounty.select.done.retry')}
          onPress={onRetry}
          testID="bounty-select-done-retry"
          modifiers={[frame({ minHeight: vars['--touch-min'] })]}
        />
      </HStack>
    );
  }
  if (address.kind === 'none') return null;
  return (
    <VStack
      alignment="leading"
      spacing={vars['--space-1']}
      modifiers={[
        fill,
        accessibilityElement('combine'),
        accessibilityIdentifier('bounty-select-done-address'),
      ]}
    >
      <Text modifiers={[font({ textStyle: 'footnote' }), secondary]}>
        {t('bounty.select.done.addressRow')}
      </Text>
      <Text modifiers={[font({ textStyle: 'body' }), wraps]}>{address.address}</Text>
    </VStack>
  );
}

export function SelectedSummary({
  helper,
  detail,
  onRetry,
}: {
  helper: Person | null;
  detail: DetailLoad;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const address = addressView(detail);
  const name = helper ? (helper.name ?? t('bounty.post.unknownName')) : null;
  return (
    <Section
      footer={
        name && address.kind === 'shown' ? (
          <Text>{t('bounty.select.done.addressFooter', { name })}</Text>
        ) : undefined
      }
    >
      {helper ? <HelperRow helper={helper} /> : null}
      <AddressRow address={address} onRetry={onRetry} />
    </Section>
  );
}
