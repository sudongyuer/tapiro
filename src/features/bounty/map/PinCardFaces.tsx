import { SymbolView } from 'expo-symbols';
import type { Ref } from 'react';
import {
  type AccessibilityActionEvent,
  PlatformColor,
  StyleSheet,
  View,
  type ViewInstance,
} from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Avatar } from '@/ui/Avatar';
import { HandArtSticker } from '@/ui/HandArt';
import { PillButton } from '@/ui/PillButton';
import { TierHeads } from '@/ui/TierMark';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { CardCopy } from '../board/cardCopy';
import type { BoardRow } from '../board/types';

const STICKER = 44;
const AVATAR = 24;
const SYMBOL = vars['--text-meta'];

type FaceProps = {
  row: BoardRow;
  copy: CardCopy;
  summaryRef: Ref<ViewInstance>;
  onFlip: () => void;
  onApply: () => void;
  onOpen: () => void;
};

function useSummaryActions({ onFlip, onOpen }: Pick<FaceProps, 'onFlip' | 'onOpen'>) {
  const { t } = useI18n();
  return {
    accessibilityActions: [
      { name: 'activate' },
      { name: 'details', label: t('bounty.board.map.details') },
    ],
    onAccessibilityAction: (event: AccessibilityActionEvent) =>
      event.nativeEvent.actionName === 'details' ? onOpen() : onFlip(),
  };
}

function Applied({ testID }: { testID: string }) {
  const { t } = useI18n();
  return (
    <View style={styles.applied}>
      <SymbolView name="circle.inset.filled" size={SYMBOL} tintColor={PlatformColor('label')} />
      <AppText variant="meta" testID={testID} style={styles.appliedText}>
        {t('bounty.board.applied')}
      </AppText>
    </View>
  );
}

function WhenWhere({
  urgent,
  when,
  place,
  lines,
}: {
  urgent: boolean;
  when: string | null;
  place: string | null;
  lines?: number;
}) {
  const { color } = useTheme();
  const ink = color('--color-urgent');
  return (
    <AppText variant="meta" tone="secondaryLabel" numberOfLines={lines}>
      {urgent ? (
        <>
          <SymbolView name="clock.badge.exclamationmark" size={SYMBOL} tintColor={ink} />{' '}
        </>
      ) : null}
      {when ? (
        <AppText
          variant="meta"
          tone="secondaryLabel"
          style={urgent && [styles.urgent, { color: ink }]}
        >
          {when}
        </AppText>
      ) : null}
      {when && place ? ' ' : null}
      {place}
    </AppText>
  );
}

export function CardFront({ row, copy, summaryRef, onFlip, onApply, onOpen }: FaceProps) {
  const { t } = useI18n();
  const actions = useSummaryActions({ onFlip, onOpen });
  return (
    <>
      <View
        ref={summaryRef}
        accessible
        accessibilityRole="button"
        accessibilityLabel={copy.label}
        testID="map-card-front"
        {...actions}
        style={styles.summary}
      >
        <View style={styles.head}>
          <HandArtSticker source={row} size={STICKER} />
          <View style={styles.headText}>
            <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
              {copy.category}
            </AppText>
            <AppText variant="body" numberOfLines={2} style={styles.title}>
              {row.title}
            </AppText>
          </View>
        </View>
        <WhenWhere urgent={row.urgent} when={copy.when} place={copy.place} lines={2} />
      </View>
      <View style={styles.foot}>
        <AppText variant="reward" style={styles.reward}>
          {copy.reward}
        </AppText>
        {row.appliedByMe ? (
          <Applied testID="map-card-applied" />
        ) : (
          <PillButton label={t('bounty.board.apply')} onPress={onApply} testID="map-card-apply" />
        )}
      </View>
    </>
  );
}

export function CardBack({ row, copy, summaryRef, onFlip, onApply, onOpen }: FaceProps) {
  const { t } = useI18n();
  const actions = useSummaryActions({ onFlip, onOpen });
  return (
    <>
      <View
        ref={summaryRef}
        accessible
        accessibilityRole="button"
        accessibilityLabel={copy.label}
        testID="map-card-back"
        {...actions}
        style={styles.summary}
      >
        <View style={styles.head}>
          <AppText variant="body" numberOfLines={2} style={[styles.title, styles.headText]}>
            {row.title}
          </AppText>
          <AppText variant="reward" style={styles.reward}>
            {copy.reward}
          </AppText>
        </View>
        {copy.when ? <WhenWhere urgent={row.urgent} when={copy.when} place={null} /> : null}
        <AppText variant="meta" tone="secondaryLabel" numberOfLines={3}>
          {copy.place}
        </AppText>
        <View style={styles.poster}>
          <Avatar uri={null} size={AVATAR} label={copy.name} initial={copy.initial} />
          <View style={styles.headText}>
            <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
              {copy.name}
            </AppText>
            <View style={styles.tier}>
              <TierHeads rank={copy.rank} />
              <AppText variant="meta" tone="secondaryLabel" numberOfLines={1} style={styles.shrink}>
                {copy.tier}
              </AppText>
            </View>
          </View>
        </View>
        {row.appliedByMe ? <Applied testID="map-card-back-applied" /> : null}
      </View>
      <View style={styles.actions}>
        <View style={styles.action}>
          <PillButton
            label={t('bounty.board.map.details')}
            variant="secondary"
            onPress={onOpen}
            testID="map-card-details"
          />
        </View>
        {row.appliedByMe ? null : (
          <View style={styles.action}>
            <PillButton
              label={t('bounty.board.apply')}
              onPress={onApply}
              testID="map-card-back-apply"
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { gap: vars['--space-2'] },
  head: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  headText: { flex: 1, minWidth: 0 },
  title: { fontWeight: '600' },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: vars['--space-3'],
  },
  reward: { flexShrink: 0 },
  applied: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: vars['--space-1'],
  },
  appliedText: { flexShrink: 1, fontWeight: '600' },
  urgent: { fontWeight: '600' },
  poster: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  shrink: { flexShrink: 1 },
  actions: { flexDirection: 'row', gap: vars['--space-2'] },
  action: { flex: 1 },
});
