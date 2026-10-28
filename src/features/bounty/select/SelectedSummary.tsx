import { HStack, RNHostView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  fixedSize,
  font,
  frame,
  layoutPriority,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { nameInitial } from '@/lib/nameInitial';
import { Avatar } from '@/ui/Avatar';
import { TierMark } from '@/ui/TierMark';
import { vars } from '@/ui/theme/tokens';

import type { Person } from '../board/types';
import { tierName, tierRank } from '../shared/tierCopy';
import { addressView } from '../shared/exactAddress';
import { AddressSection } from '../shared/AddressSection';
import type { DetailLoad } from './applicantsController';

const AVATAR = 36;
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
      <Text modifiers={[font({ textStyle: 'body', weight: 'semibold' }), lineLimit(1)]}>
        {name}
      </Text>
      <TierMark
        label={tier}
        rank={tierRank(helper.tier)}
        modifiers={[fixedSize(), layoutPriority(1)]}
      />
    </HStack>
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
    <AddressSection
      address={address}
      name={name}
      onRetry={onRetry}
      testID="bounty-select-done-address"
    >
      {helper ? <HelperRow helper={helper} /> : null}
    </AddressSection>
  );
}
