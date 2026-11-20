import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useSheetFill } from '@/ui/theme/useSheetFill';
import { useTheme } from '@/ui/theme/useTheme';

import type { TapirTurn } from './conversation';
import type { MemoryFailure, MemoryUse } from './memory';
import { askSession, memoryStore } from './services';

export function UsedMemory({
  used,
  onEdit,
  testID,
}: {
  used: MemoryUse[];
  onEdit: (id: string) => void;
  testID: string;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <>
      {used.map((use, index) => (
        <View key={use.id} style={styles.used}>
          <AppText
            variant="secondary"
            tone="secondaryLabel"
            style={styles.grow}
            testID={`${testID}-used-${index}`}
          >
            {t('ask.memory.used', { label: use.label, content: use.content })}
          </AppText>
          <PressDim
            accessibilityRole="button"
            accessibilityLabel={t('ask.memory.editA11y', { label: use.label })}
            onPress={() => onEdit(use.id)}
            testID={`${testID}-used-${index}-edit`}
            style={styles.edit}
          >
            <AppText variant="secondary" style={{ color: color('--color-accent') }}>
              {t('ask.memory.edit')}
            </AppText>
          </PressDim>
        </View>
      ))}
    </>
  );
}

export function OfferCard({
  userId,
  turn,
  testID,
}: {
  userId: string;
  turn: TapirTurn;
  testID: string;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<MemoryFailure | null>(null);
  const fill = useSheetFill();
  const offer = turn.memory?.offer;
  if (!offer || turn.offer === 'dismissed') return null;
  if (turn.offer === 'saved') {
    return (
      <AppText variant="secondary" tone="secondaryLabel" testID={`${testID}-saved`}>
        {t('ask.memory.offer.saved')}
      </AppText>
    );
  }

  const remember = async () => {
    if (saving) return;
    const since = askSession.generation(userId);
    memoryStore.attach(userId);
    setSaving(true);
    setFailure(null);
    const { kind, label, content } = offer;
    const result = await memoryStore.save({ id: null, kind, label, content });
    setSaving(false);
    if (result.ok) askSession.settleOffer(userId, since, turn, 'saved');
    else setFailure(result.failure);
  };

  return (
    <View style={[styles.card, { backgroundColor: fill }]} testID={testID}>
      <AppText variant="title">
        {offer.replaces
          ? t('ask.memory.offer.replaceTitle', { label: offer.label })
          : t('ask.memory.offer.title')}
      </AppText>
      <AppText variant="secondary" tone="secondaryLabel" testID={`${testID}-pair`}>
        {t('ask.memory.offer.pair', { label: offer.label, content: offer.content })}
      </AppText>
      {offer.replaces ? (
        <AppText variant="secondary" tone="secondaryLabel" testID={`${testID}-now`}>
          {t('ask.memory.offer.now', { content: offer.replaces })}
        </AppText>
      ) : null}
      <View style={styles.buttons}>
        <PillButton
          label={t('ask.memory.offer.save')}
          loading={saving}
          loadingLabel={t('ask.memory.offer.saving')}
          onPress={() => void remember()}
          testID={`${testID}-save`}
        />
        <PillButton
          label={t('ask.memory.offer.dismiss')}
          variant="secondary"
          disabled={saving}
          onPress={() =>
            askSession.settleOffer(userId, askSession.generation(userId), turn, 'dismissed')
          }
          testID={`${testID}-dismiss`}
        />
      </View>
      {failure ? (
        <AppText variant="secondary" testID={`${testID}-failure`}>
          {t(`ask.memory.error.${failure}`)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: vars['--space-3'],
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
  used: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  grow: { flex: 1 },
  edit: {
    minWidth: vars['--touch-min'],
    minHeight: vars['--touch-min'],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
