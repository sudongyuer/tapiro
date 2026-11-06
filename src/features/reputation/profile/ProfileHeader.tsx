import { HStack, RNHostView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowBackground,
  monospacedDigit,
  multilineTextAlignment,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { nameInitial } from '@/lib/nameInitial';
import { Avatar } from '@/ui/Avatar';
import { TierMark } from '@/ui/TierMark';
import { vars } from '@/ui/theme/tokens';

import type { ProfileCard } from '../types';
import { countText, isNewcomer, personName, rateText, tierLabel, tierRank } from './profileView';

const AVATAR = 56;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });

export function ProfileHeader({ card }: { card: ProfileCard }) {
  const { t } = useI18n();
  const name = personName(card.name, t);
  const tier = tierLabel(card.tier, t);
  const note = isNewcomer(card) ? t('reputation.profile.newcomer') : t('reputation.profile.recent');
  return (
    <Section modifiers={[listRowBackground('clear')]}>
      <HStack spacing={vars['--space-3']}>
        <RNHostView matchContents>
          <Avatar uri={card.avatarUrl} size={AVATAR} label={name} initial={nameInitial(name)} />
        </RNHostView>
        <VStack alignment="leading" spacing={vars['--space-1']} modifiers={[fill]}>
          <Text
            modifiers={[
              font({ textStyle: 'title2', weight: 'bold' }),
              lineLimit(1),
              truncationMode('tail'),
              accessibilityLabel(name),
              accessibilityIdentifier('profile-name'),
            ]}
          >
            {name}
          </Text>
          <HStack
            spacing={vars['--space-2']}
            modifiers={[
              accessibilityElement('combine'),
              accessibilityLabel([tier, note].join(t('reputation.profile.listJoin'))),
              accessibilityIdentifier('profile-tier'),
            ]}
          >
            <TierMark label={tier} rank={tierRank(card.tier)} />
            <Text modifiers={[font({ textStyle: 'footnote' }), secondary, lineLimit(1)]}>
              {note}
            </Text>
          </HStack>
          {card.blockedByMe ? (
            <Text
              modifiers={[
                font({ textStyle: 'footnote' }),
                secondary,
                accessibilityIdentifier('profile-blocked'),
              ]}
            >
              {t('reputation.profile.blocked', { name })}
            </Text>
          ) : null}
        </VStack>
      </HStack>
    </Section>
  );
}

function Stat({
  value,
  label,
  muted = false,
  testID,
}: {
  value: string;
  label: string;
  muted?: boolean;
  testID: string;
}) {
  return (
    <VStack
      spacing={2}
      modifiers={[
        frame({ maxWidth: Infinity }),
        accessibilityElement('ignore'),
        accessibilityLabel(`${label} ${value}`),
        accessibilityIdentifier(testID),
      ]}
    >
      <Text
        modifiers={
          muted
            ? [
                font({ textStyle: 'footnote', weight: 'semibold' }),
                secondary,
                frame({ minHeight: 28 }),
              ]
            : [
                font({ textStyle: 'title2', weight: 'heavy', design: 'rounded' }),
                monospacedDigit(),
                lineLimit(1),
              ]
        }
      >
        {value}
      </Text>
      <Text
        modifiers={[font({ textStyle: 'footnote' }), secondary, multilineTextAlignment('center')]}
      >
        {label}
      </Text>
    </VStack>
  );
}

export function ProfileNumbers({ card }: { card: ProfileCard }) {
  const { t, language } = useI18n();
  const rate = rateText(card.completionRate, language);
  return (
    <Section>
      <HStack alignment="top" spacing={vars['--space-2']}>
        <Stat
          value={countText(card.helped, language)}
          label={t('reputation.profile.helped')}
          testID="profile-helped"
        />
        <Stat
          value={rate ?? t('reputation.profile.rateAfterFive')}
          label={t('reputation.profile.completionRate')}
          muted={rate === null}
          testID="profile-rate"
        />
        <Stat
          value={countText(card.reviewCount, language)}
          label={t('reputation.profile.reviews')}
          testID="profile-count-reviews"
        />
      </HStack>
    </Section>
  );
}
