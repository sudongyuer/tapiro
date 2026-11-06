import { Button, HStack, Image, RNHostView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  contentShape,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { Mascot } from '@/ui/Mascot';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { ItemKind, ReviewTarget } from '../types';
import type { ReviewEntry } from './entryView';
import { useReviewEntries } from './useReviewEntries';

const HEAD = 22;
const primary = foregroundStyle({ type: 'hierarchical', style: 'primary' });
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });
const wraps = fixedSize({ horizontal: false, vertical: true });
const fill = frame({ maxWidth: Infinity, alignment: 'leading' });

function EntryBody({ entry, target }: { entry: ReviewEntry; target: ReviewTarget | null }) {
  const { color } = useTheme();
  return (
    <HStack
      spacing={vars['--space-3']}
      modifiers={[
        accessibilityElement(target ? 'combine' : 'ignore'),
        ...(target
          ? []
          : [accessibilityLabel(entry.label), accessibilityIdentifier(`review-entry-${entry.id}`)]),
        contentShape(shapes.rectangle()),
      ]}
    >
      <RNHostView matchContents>
        <Mascot variant="side" size={HEAD} darkOutline />
      </RNHostView>
      <VStack alignment="leading" spacing={2} modifiers={[fill]}>
        <Text modifiers={[primary, font({ weight: 'semibold' }), lineLimit(1)]}>{entry.title}</Text>
        {entry.detail ? (
          <Text modifiers={[secondary, font({ textStyle: 'footnote' }), wraps]}>
            {entry.detail}
          </Text>
        ) : null}
      </VStack>
      {entry.trailing ? (
        <Text
          modifiers={[
            target ? foregroundStyle(color('--color-accent')) : secondary,
            font({ textStyle: 'footnote' }),
          ]}
        >
          {entry.trailing}
        </Text>
      ) : null}
      {target ? (
        <Image systemName="chevron.right" size={14} modifiers={[tertiary, accessibilityHidden()]} />
      ) : null}
    </HStack>
  );
}

export function ReviewEntriesSection({
  kind,
  itemId,
  title,
}: {
  kind: ItemKind;
  itemId: string;
  title: string;
}) {
  const { t } = useI18n();
  const { entries, failed, stale, retry, open } = useReviewEntries(kind, itemId, title);
  const again = {
    label: t('reputation.profile.retry'),
    onPress: retry,
    testID: 'review-entries-retry',
  };
  if (failed) {
    return (
      <NoticeCard
        tone="warning"
        icon="exclamationmark.triangle.fill"
        title={t('reputation.entry.failed')}
        action={again}
        testID="review-entries-failed"
      />
    );
  }
  if (entries.length === 0) return null;
  return (
    <>
      {stale ? (
        <NoticeCard
          tone="warning"
          icon="exclamationmark.triangle.fill"
          title={t('reputation.entry.stale')}
          action={again}
          testID="review-entries-stale"
        />
      ) : null}
      <Section>
        {entries.map((entry) => {
          const { target } = entry;
          return target ? (
            <Button
              key={entry.id}
              onPress={() => open(target)}
              testID={`review-entry-${entry.id}`}
              modifiers={[accessibilityLabel(entry.label)]}
            >
              <EntryBody entry={entry} target={target} />
            </Button>
          ) : (
            <EntryBody key={entry.id} entry={entry} target={null} />
          );
        })}
      </Section>
    </>
  );
}
