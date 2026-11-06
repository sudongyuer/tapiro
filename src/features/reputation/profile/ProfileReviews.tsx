import { Button, HStack, Image, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  accessibilityIdentifier,
  contentShape,
  font,
  foregroundStyle,
  listRowBackground,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { PlatformColor } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useSelectedUntilReturn } from '@/ui/useSelectedUntilReturn';

import type { ProfileCard } from '../types';
import { countText, personName, showsAllReviews } from './profileView';
import { ReviewRow } from './ReviewRow';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

export function FacesLine({ card }: { card: ProfileCard }) {
  const { t, language } = useI18n();
  return (
    <Text
      modifiers={[
        font({ textStyle: 'footnote' }),
        secondary,
        accessibilityIdentifier('profile-faces'),
      ]}
    >
      {t('reputation.profile.faces', {
        happy: countText(card.faces.happy, language),
        okay: countText(card.faces.okay, language),
        unhappy: countText(card.faces.unhappy, language),
      })}
    </Text>
  );
}

export function ProfileReviewsSection({
  card,
  onOpenAll,
  onReply,
  onReport,
}: {
  card: ProfileCard;
  onOpenAll: () => void;
  onReply: (reviewId: string) => void;
  onReport: (reviewId: string) => void;
}) {
  const { t } = useI18n();
  const { selected, select } = useSelectedUntilReturn();
  const owner = personName(card.name, t);
  if (card.reviewCount === 0) {
    return (
      <Section title={t('reputation.profile.reviews')}>
        <Text modifiers={[secondary, accessibilityIdentifier('profile-no-reviews')]}>
          {t('reputation.profile.noReviews')}
        </Text>
      </Section>
    );
  }
  return (
    <Section title={t('reputation.profile.reviews')}>
      <FacesLine card={card} />
      {card.latestReviews.map((review) => (
        <ReviewRow
          key={review.id}
          review={review}
          owner={owner}
          self={card.self}
          onReply={card.self ? onReply : null}
          onReport={onReport}
        />
      ))}
      {showsAllReviews(card) ? (
        <Button
          onPress={() => {
            select();
            onOpenAll();
          }}
          testID="profile-all-reviews"
          modifiers={selected ? [listRowBackground(PlatformColor('systemGray4'))] : []}
        >
          <HStack spacing={vars['--space-2']} modifiers={[contentShape(shapes.rectangle())]}>
            <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'primary' })]}>
              {t('reputation.profile.allReviews', { count: card.reviewCount })}
            </Text>
            <Spacer />
            <Image
              systemName="chevron.right"
              size={14}
              modifiers={[tertiary, accessibilityHidden()]}
            />
          </HStack>
        </Button>
      ) : null}
    </Section>
  );
}
