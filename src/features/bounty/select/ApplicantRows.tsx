import { Button, HStack, Image, RNHostView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';

import { useI18n } from '@/lib/i18n';
import { nameInitial } from '@/lib/nameInitial';
import { Avatar } from '@/ui/Avatar';
import { CategorySticker } from '@/ui/CategorySticker';
import { TierMark } from '@/ui/TierMark';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { BountyDetail } from '../board/types';
import { ringgit } from '../post/blockedReason';
import { tierName, tierRank } from '../shared/tierCopy';
import { helpedLine } from './selectCopy';
import type { Applicant } from './types';

const STICKER = 48;
const AVATAR = 36;
const CHECK = 17;
const primary = foregroundStyle({ type: 'hierarchical', style: 'primary' });
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const wraps = fixedSize({ horizontal: false, vertical: true });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });
const NO_INSETS = listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 });

export function ApplicantsHeader({
  detail,
  status,
  done = false,
}: {
  detail: BountyDetail | null;
  status: string | null;
  done?: boolean;
}) {
  const { t, language } = useI18n();
  const reward = detail ? ringgit(detail.rewardSen, language) : null;
  return (
    <Section modifiers={[listRowBackground('clear')]}>
      <VStack spacing={vars['--space-2']} modifiers={[frame({ maxWidth: Infinity })]}>
        {detail ? (
          <>
            <RNHostView matchContents>
              <CategorySticker category={detail.category} size={STICKER} />
            </RNHostView>
            <Text
              modifiers={[
                font({ textStyle: 'title3', weight: 'semibold' }),
                multilineTextAlignment('center'),
                wraps,
                accessibilityIdentifier('bounty-applicants-title'),
              ]}
            >
              {detail.title}
            </Text>
          </>
        ) : null}
        {status === null ? null : (
          <Text
            modifiers={[
              done ? font({ textStyle: 'headline' }) : font({ textStyle: 'subheadline' }),
              done ? primary : secondary,
              multilineTextAlignment('center'),
              wraps,
              accessibilityIdentifier(done ? 'bounty-select-done' : 'bounty-applicants-status'),
            ]}
          >
            {status}
          </Text>
        )}
        {reward ? (
          <Text
            modifiers={[
              font({ size: vars['--text-reward'], weight: 'heavy', design: 'rounded' }),
              accessibilityLabel(t('bounty.post.confirm.rewardLabel', { amount: reward })),
              accessibilityIdentifier('bounty-applicants-reward'),
            ]}
          >
            {reward}
          </Text>
        ) : null}
      </VStack>
    </Section>
  );
}

export function StateRow({ children }: { children: ReactElement }) {
  return (
    <Section modifiers={[listRowBackground('clear'), NO_INSETS]}>
      <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
    </Section>
  );
}

function ApplicantRow({
  applicant,
  chosen,
  onChoose,
}: {
  applicant: Applicant;
  chosen: boolean;
  onChoose: (id: string) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const name = applicant.name ?? t('bounty.post.unknownName');
  const tier = tierName(applicant.tier, t);
  const meta = helpedLine(applicant.helpedCount, t);
  const note = applicant.note ? `「${applicant.note}」` : null;
  const label = [
    t('bounty.select.a11y.row', { name, tier, meta }),
    applicant.note ? t('bounty.select.a11y.note', { note: applicant.note }) : null,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Button
      onPress={() => onChoose(applicant.id)}
      testID={`bounty-applicant-${applicant.id}`}
      modifiers={[
        accessibilityLabel(label),
        ...(chosen ? [accessibilityAddTraits(['isSelected'])] : []),
      ]}
    >
      <HStack alignment="top" spacing={vars['--space-3']}>
        <RNHostView matchContents>
          <Avatar uri={null} size={AVATAR} label={name} initial={nameInitial(name)} />
        </RNHostView>
        <VStack alignment="leading" spacing={vars['--space-1']} modifiers={[fill]}>
          <HStack spacing={vars['--space-2']} alignment="center">
            <Text modifiers={[font({ textStyle: 'body', weight: 'semibold' }), primary, wraps]}>
              {name}
            </Text>
            <TierMark label={tier} rank={tierRank(applicant.tier)} />
          </HStack>
          <Text modifiers={[font({ textStyle: 'footnote' }), secondary, wraps]}>{meta}</Text>
          {note ? <Text modifiers={[primary, wraps]}>{note}</Text> : null}
        </VStack>
        <Image
          systemName="checkmark"
          size={CHECK}
          modifiers={[
            foregroundStyle(chosen ? color('--color-accent') : 'clear'),
            font({ textStyle: 'body', weight: 'semibold' }),
            accessibilityHidden(),
          ]}
        />
      </HStack>
    </Button>
  );
}

export function ApplicantSection({
  applicants,
  chosen,
  onChoose,
}: {
  applicants: Applicant[];
  chosen: string | null;
  onChoose: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Section
      title={t('bounty.select.sectionHeader')}
      footer={<Text>{t('bounty.select.footer')}</Text>}
    >
      {applicants.map((applicant) => (
        <ApplicantRow
          key={applicant.id}
          applicant={applicant}
          chosen={applicant.id === chosen}
          onChoose={onChoose}
        />
      ))}
    </Section>
  );
}
