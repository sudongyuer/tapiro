import {
  Button,
  ContextMenu,
  HStack,
  Image,
  ProgressView,
  RNHostView,
  Section,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  contentShape,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  listRowBackground,
  multilineTextAlignment,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import type { BlockedPerson } from '@/features/block';
import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import type { ConfirmCopy } from '@/ui/confirm';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { HandArtSticker } from '@/ui/HandArt';
import { TierMark } from '@/ui/TierMark';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { BountyDetail } from '../board/types';
import { StatusLine } from '../shared/StatusLine';
import { tierName, tierRank } from '../shared/tierCopy';
import { AvatarButton } from './AvatarButton';
import { helpedLine } from './selectCopy';
import type { Applicant } from './types';

const STICKER = 48;
const CHECK = 17;
const primary = foregroundStyle({ type: 'hierarchical', style: 'primary' });
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const wraps = fixedSize({ horizontal: false, vertical: true });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });
const target = [
  frame({ maxWidth: Infinity, minHeight: vars['--touch-min'], alignment: 'topLeading' }),
  contentShape(shapes.rectangle()),
  multilineTextAlignment('leading'),
];

export function ApplicantsHeader({
  detail,
  status,
  done = false,
  ended = false,
}: {
  detail: BountyDetail | null;
  status: string | null;
  done?: boolean;
  ended?: boolean;
}) {
  const { t, language } = useI18n();
  const reward = detail ? formatMoney(detail.reward, language, { whole: true }) : null;
  return (
    <Section modifiers={[listRowBackground('clear')]}>
      <VStack spacing={vars['--space-2']} modifiers={[frame({ maxWidth: Infinity })]}>
        {detail ? (
          <>
            <RNHostView matchContents>
              <HandArtSticker source={detail} size={STICKER} />
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
        {status === null ? null : ended ? (
          <StatusLine tone="ended" text={status} testID="bounty-applicants-status" />
        ) : (
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

type Motion = (id: string) => ModifierConfig[];
type BlockActions = {
  copy: (person: BlockedPerson) => ConfirmCopy;
  confirmed: (person: BlockedPerson) => void;
};

function ApplicantRow({
  applicant,
  chosen,
  blocking,
  canBlock,
  motion,
  onChoose,
  onBlock,
  onOpenProfile,
}: {
  applicant: Applicant;
  motion: Motion;
  chosen: boolean;
  blocking: boolean;
  canBlock: boolean;
  onChoose: (id: string) => void;
  onBlock: BlockActions;
  onOpenProfile: (id: string) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [asking, setAsking] = useState(false);
  const person = { id: applicant.id, name: applicant.name };
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
  const row = (
    <Button
      onPress={() => onChoose(applicant.id)}
      testID={`bounty-applicant-${applicant.id}`}
      modifiers={[
        buttonStyle('borderless'),
        accessibilityLabel(label),
        ...(chosen ? [accessibilityAddTraits(['isSelected'])] : []),
      ]}
    >
      <HStack alignment="top" spacing={vars['--space-3']} modifiers={target}>
        <VStack alignment="leading" spacing={vars['--space-1']} modifiers={[fill]}>
          <HStack spacing={vars['--space-2']} alignment="center">
            <Text
              modifiers={[font({ textStyle: 'body', weight: 'semibold' }), primary, lineLimit(1)]}
            >
              {name}
            </Text>
            <TierMark
              label={tier}
              rank={tierRank(applicant.tier)}
              modifiers={[fixedSize(), layoutPriority(1)]}
            />
          </HStack>
          <Text modifiers={[font({ textStyle: 'footnote' }), secondary, wraps]}>{meta}</Text>
          {note ? <Text modifiers={[primary, wraps]}>{note}</Text> : null}
        </VStack>
        {blocking ? (
          <ProgressView
            modifiers={[
              accessibilityLabel(t('block.blocking')),
              accessibilityIdentifier(`bounty-applicant-blocking-${applicant.id}`),
            ]}
          />
        ) : (
          <Image
            systemName="checkmark"
            size={CHECK}
            modifiers={[
              foregroundStyle(chosen ? color('--color-accent') : 'clear'),
              font({ textStyle: 'body', weight: 'semibold' }),
              accessibilityHidden(),
            ]}
          />
        )}
      </HStack>
    </Button>
  );
  return (
    <ConfirmDialog
      copy={onBlock.copy(person)}
      destructive
      presented={asking}
      onPresentedChange={setAsking}
      onConfirm={() => onBlock.confirmed(person)}
    >
      <ContextMenu>
        <ContextMenu.Items>
          <Button
            label={t('reputation.profile.open', { name })}
            systemImage="person.crop.circle"
            onPress={() => onOpenProfile(applicant.id)}
            testID={`bounty-applicant-open-${applicant.id}`}
          />
          {canBlock ? (
            <Button
              label={t('block.menu', { name })}
              systemImage="hand.raised"
              role="destructive"
              onPress={() => setAsking(true)}
              testID={`bounty-applicant-block-${applicant.id}`}
            />
          ) : null}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <HStack alignment="top" spacing={vars['--space-3']} modifiers={motion(applicant.id)}>
            <AvatarButton id={applicant.id} name={name} onPress={onOpenProfile} />
            {row}
          </HStack>
        </ContextMenu.Trigger>
      </ContextMenu>
    </ConfirmDialog>
  );
}

export function ApplicantSection({
  applicants,
  chosen,
  blocking,
  canBlock,
  motion,
  onChoose,
  onBlock,
  onOpenProfile,
}: {
  applicants: Applicant[];
  motion: Motion;
  chosen: string | null;
  blocking: string | null;
  canBlock: boolean;
  onChoose: (id: string) => void;
  onBlock: BlockActions;
  onOpenProfile: (id: string) => void;
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
          blocking={applicant.id === blocking}
          canBlock={canBlock}
          motion={motion}
          onChoose={onChoose}
          onBlock={onBlock}
          onOpenProfile={onOpenProfile}
        />
      ))}
    </Section>
  );
}
