import { HStack, Image, RNHostView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowSeparator,
  multilineTextAlignment,
  strikethrough,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { HandArtSticker } from '@/ui/HandArt';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import {
  etaChangedText,
  headerReward,
  lineText,
  statusClock,
  stepLabel,
  stepText,
  summaryText,
  type CopyContext,
} from './statusCopy';
import { timeline, type StepState, type TimelineStep } from './timeline';
import type { StatusDetail } from './types';
import { useEtaFlip } from './useEtaFlip';

const STICKER = 48;
const ICON = 20;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });
const wraps = fixedSize({ horizontal: false, vertical: true });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });

const ICONS: Record<StepState, SFSymbol> = {
  done: 'checkmark.circle.fill',
  current: 'circle.fill',
  needsYou: 'exclamationmark.circle.fill',
  upcoming: 'circle',
};

export function StatusHeader({ detail }: { detail: StatusDetail }) {
  const { t, language } = useI18n();
  const reward = headerReward(detail, t, language);
  const summary = summaryText(detail, detail.viewerRole, t);
  return (
    <Section modifiers={[listRowBackground('clear')]}>
      <VStack spacing={vars['--space-2']} modifiers={[frame({ maxWidth: Infinity })]}>
        <RNHostView matchContents>
          <HandArtSticker source={detail} size={STICKER} />
        </RNHostView>
        <Text
          modifiers={[
            font({ textStyle: 'title3', weight: 'semibold' }),
            multilineTextAlignment('center'),
            wraps,
            accessibilityIdentifier('bounty-status-title'),
          ]}
        >
          {detail.title}
        </Text>
        {summary ? (
          <Text
            modifiers={[
              font({ textStyle: 'headline' }),
              multilineTextAlignment('center'),
              wraps,
              accessibilityIdentifier('bounty-status-summary'),
            ]}
          >
            {summary}
          </Text>
        ) : null}
        <VStack spacing={vars['--space-1']}>
          <Text
            modifiers={[
              font({ size: vars['--text-reward'], weight: 'heavy', design: 'rounded' }),
              accessibilityLabel(reward.rewardLabel),
              accessibilityIdentifier('bounty-status-reward'),
            ]}
          >
            {reward.reward}
          </Text>
          {reward.reference ? (
            <Text
              modifiers={[
                font({ textStyle: 'footnote' }),
                secondary,
                accessibilityIdentifier('bounty-status-reference'),
              ]}
            >
              {reward.reference}
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </Section>
  );
}

type LineMotion = Partial<Record<TimelineStep['lines'][number]['kind'], ModifierConfig[]>>;

function StepRow({
  step,
  extra,
  motion,
  copy,
}: {
  step: TimelineStep;
  extra: string | null;
  motion: LineMotion;
  copy: CopyContext;
}) {
  const { color } = useTheme();
  const text = stepText(step, copy);
  const time = step.at ? statusClock(step.at, copy) : null;
  const lines = step.lines.map((line) => ({ line, text: lineText(line, copy) }));
  const shown = extra ? [...lines.map((entry) => entry.text), extra] : lines.map((e) => e.text);
  const icon =
    step.state === 'done'
      ? foregroundStyle(color('--color-success'))
      : step.state === 'needsYou'
        ? foregroundStyle(color('--color-warning'))
        : step.state === 'upcoming'
          ? tertiary
          : foregroundStyle({ type: 'hierarchical', style: 'primary' });
  const upcoming = step.state === 'upcoming';
  return (
    <HStack
      alignment="top"
      spacing={vars['--space-3']}
      modifiers={[
        listRowSeparator('hidden'),
        accessibilityElement('ignore'),
        accessibilityLabel(stepLabel(step, [text, time, ...shown], copy)),
        accessibilityIdentifier(`bounty-status-step-${step.id}`),
      ]}
    >
      <Image systemName={ICONS[step.state]} size={ICON} modifiers={[icon]} />
      <VStack alignment="leading" spacing={vars['--space-1']} modifiers={[fill]}>
        <HStack spacing={vars['--space-2']} alignment="firstTextBaseline">
          <Text
            modifiers={[
              font({ textStyle: 'body', weight: step.state === 'done' ? 'regular' : 'semibold' }),
              ...(upcoming ? [secondary] : []),
              fill,
              wraps,
            ]}
          >
            {text}
          </Text>
          {time ? (
            <Text modifiers={[font({ textStyle: 'footnote' }), secondary, fixedSize()]}>
              {time}
            </Text>
          ) : null}
        </HStack>
        {lines.map(({ line, text: shownLine }) => (
          <Text
            key={line.kind}
            modifiers={[
              font({
                textStyle: line.kind === 'eta' ? 'subheadline' : 'footnote',
                weight: line.kind === 'eta' ? 'semibold' : 'regular',
              }),
              line.tone === 'warning' ? foregroundStyle(color('--color-warning')) : secondary,
              ...(line.struck
                ? [strikethrough({ isActive: true, pattern: 'solid' }), tertiary]
                : []),
              wraps,
              ...(motion[line.kind] ?? []),
              accessibilityIdentifier(`bounty-status-line-${line.kind}`),
            ]}
          >
            {shownLine}
          </Text>
        ))}
        {extra ? (
          <Text
            modifiers={[
              font({ textStyle: 'footnote' }),
              secondary,
              wraps,
              accessibilityIdentifier('bounty-status-line-etaChanged'),
            ]}
          >
            {extra}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );
}

export function StatusTimeline({ detail, now }: { detail: StatusDetail; now: Date }) {
  const { t, language } = useI18n();
  const copy: CopyContext = { t, language, now };
  const role = detail.viewerRole;
  const { steps } = timeline(detail, role);
  const changed = etaChangedText(detail, role, copy);
  const flip = useEtaFlip(detail.status === 'en_route' ? detail.etaAt : null);
  const motion: LineMotion = { eta: flip.eta, etaPrevious: flip.previous };
  return (
    <Section title={t('bounty.status.progress')}>
      {steps.map((step) => (
        <StepRow
          key={step.id}
          step={step}
          extra={step.id === 'started' ? changed : null}
          motion={step.id === 'started' ? motion : {}}
          copy={copy}
        />
      ))}
    </Section>
  );
}
