import { Button, HStack, ProgressView, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  layoutPriority,
  lineLimit,
  monospacedDigit,
  onAppear,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import { useMemo } from 'react';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

import type { History } from '../coinsStore';
import { groupByMonth, signedDelta } from '../history';
import { coinsStore } from '../services';
import type { CoinRow } from '../types';
import { monthLabel, rowA11y, rowDate, rowTitle } from './coinsView';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function CoinsHistory({ history }: { history: History }) {
  const { t } = useI18n();
  const groups = useMemo(() => groupByMonth(history.items), [history.items]);
  const last = history.items.at(-1)?.id;
  if (groups.length === 0) {
    return (
      <Section>
        <Text modifiers={[secondary, accessibilityIdentifier('coins-empty')]}>
          {t('coins.empty')}
        </Text>
      </Section>
    );
  }
  const now = new Date();
  return (
    <>
      {groups.map((group) => (
        <Section
          key={group.month}
          header={
            <Text modifiers={[accessibilityIdentifier(`coins-month-${group.month}`)]}>
              {monthLabel(group.month, t, now)}
            </Text>
          }
        >
          {group.rows.map((row) => (
            <HistoryRow key={row.id} row={row} last={row.id === last} />
          ))}
        </Section>
      ))}
      <MoreRow more={history.more} />
    </>
  );
}

function HistoryRow({ row, last }: { row: CoinRow; last: boolean }) {
  const { t, language } = useI18n();
  return (
    <HStack
      spacing={vars['--space-2']}
      modifiers={[
        accessibilityElement('ignore'),
        accessibilityLabel(rowA11y(row, t, language)),
        accessibilityIdentifier(`coins-row-${row.id}`),
        ...(last ? [onAppear(() => void coinsStore.loadMoreHistory())] : []),
      ]}
    >
      <Text modifiers={[lineLimit(1), truncationMode('tail')]}>{rowTitle(row, t)}</Text>
      <Spacer />
      <Text
        modifiers={[
          font({ textStyle: 'body', weight: 'semibold' }),
          monospacedDigit(),
          layoutPriority(1),
        ]}
      >
        {signedDelta(row.delta)}
      </Text>
      <Text
        modifiers={[
          font({ textStyle: 'subheadline' }),
          secondary,
          monospacedDigit(),
          layoutPriority(1),
        ]}
      >
        {rowDate(row.at, language)}
      </Text>
    </HStack>
  );
}

function MoreRow({ more }: { more: History['more'] }) {
  const { t } = useI18n();
  if (more === 'loading') {
    return (
      <Section>
        <ProgressView
          modifiers={[accessibilityLabel(t('coins.more')), accessibilityIdentifier('coins-more')]}
        />
      </Section>
    );
  }
  if (more !== 'failed') return null;
  const text = t('coins.moreFailedRetry', {
    failed: t('coins.moreFailed'),
    retry: t('coins.retry'),
  });
  return (
    <Section>
      <Button
        onPress={() => void coinsStore.loadMoreHistory()}
        testID="coins-more-retry"
        modifiers={[
          accessibilityLabel([t('coins.moreFailed'), t('coins.retry')].join(t('coins.listJoin'))),
        ]}
      >
        <Text>{text}</Text>
      </Button>
    </Section>
  );
}
