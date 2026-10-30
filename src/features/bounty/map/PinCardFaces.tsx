import type { Ref } from 'react';
import { type AccessibilityActionEvent, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { CategorySticker } from '@/ui/CategorySticker';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import type { CardCopy } from '../board/cardCopy';
import type { BoardRow } from '../board/types';

const STICKER = 44;

type FaceProps = {
  row: BoardRow;
  copy: CardCopy;
  summaryRef: Ref<View>;
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
    <AppText variant="meta" testID={testID} style={styles.applied}>
      {t('bounty.board.applied')}
    </AppText>
  );
}

export function CardFront({ row, copy, summaryRef, onFlip, onApply, onOpen }: FaceProps) {
  const { t } = useI18n();
  const actions = useSummaryActions({ onFlip, onOpen });
  const meta = copy.when ? `${copy.when} ${copy.place}` : copy.place;
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
          <CategorySticker category={row.category} size={STICKER} />
          <View style={styles.headText}>
            <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
              {copy.category}
            </AppText>
            <AppText variant="body" numberOfLines={2} style={styles.title}>
              {row.title}
            </AppText>
          </View>
        </View>
        <AppText variant="meta" tone="secondaryLabel" numberOfLines={2}>
          {meta}
        </AppText>
      </View>
      <View style={styles.foot}>
        <AppText variant="reward" numberOfLines={1} style={styles.reward}>
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
          <AppText variant="reward" numberOfLines={1} style={styles.reward}>
            {copy.reward}
          </AppText>
        </View>
        {copy.when ? (
          <AppText variant="meta" tone="secondaryLabel">
            {copy.when}
          </AppText>
        ) : null}
        <AppText variant="meta" tone="secondaryLabel" numberOfLines={3}>
          {copy.place}
        </AppText>
        <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
          {`${t('bounty.board.card.posterName', { name: copy.name })} ${copy.tier}`}
        </AppText>
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
  applied: { flexShrink: 1, fontWeight: '600', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: vars['--space-2'] },
  action: { flex: 1 },
});
