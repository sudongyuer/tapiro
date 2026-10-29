import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { PillButton } from '@/ui/PillButton';
import { SheetActions } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';

import { addressView } from '../shared/exactAddress';
import { AddressSection } from '../shared/AddressSection';

const HEAD = 32;
const NOTE_LINES = 3;

export function SelectedAddress({ name, address }: { name: string; address: string | null }) {
  return (
    <AddressSection
      address={addressView({ kind: 'ready', detail: { address } })}
      name={name}
      testID="bounty-detail-address"
    />
  );
}

function ProgressButton({ onProgress }: { onProgress: () => void }) {
  const { t } = useI18n();
  return (
    <PillButton
      label={t('bounty.status.action.view')}
      onPress={onProgress}
      testID="bounty-detail-progress"
    />
  );
}

export function PartyActions({
  outcome,
  name,
  onProgress,
}: {
  outcome: 'selected' | 'cancelled' | null;
  name: string;
  onProgress: (() => void) | null;
}) {
  const { t } = useI18n();
  if (outcome === null && onProgress === null) return null;
  return (
    <SheetActions>
      {outcome ? (
        <AppText
          variant="body"
          accessibilityRole="text"
          testID={`bounty-detail-${outcome}`}
          style={styles.selected}
        >
          {outcome === 'selected'
            ? t('bounty.detail.selected.title', { name })
            : t('bounty.status.cancelled')}
        </AppText>
      ) : null}
      {onProgress ? <ProgressButton onProgress={onProgress} /> : null}
    </SheetActions>
  );
}

export function NotSelectedActions({
  name,
  note,
  onBrowse,
}: {
  name: string;
  note: string | null;
  onBrowse: () => void;
}) {
  const { t } = useI18n();
  const title = t('bounty.detail.notSelected.title');
  return (
    <SheetActions>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={title}
        testID="bounty-detail-not-selected"
        style={styles.headline}
      >
        <Mascot variant="front" size={HEAD} outlined />
        <AppText variant="title" style={styles.shrink}>
          {title}
        </AppText>
      </View>
      <AppText
        variant="secondary"
        tone="secondaryLabel"
        testID="bounty-detail-not-selected-body"
        style={styles.centred}
      >
        {t('bounty.detail.notSelected.body', { name })}
      </AppText>
      {note ? (
        <AppText
          variant="secondary"
          tone="secondaryLabel"
          numberOfLines={NOTE_LINES}
          testID="bounty-detail-not-selected-note"
          style={styles.centred}
        >
          <AppText variant="meta" tone="tertiaryLabel">
            {t('bounty.detail.notSelected.yourNote')}
          </AppText>
          {` ${note}`}
        </AppText>
      ) : null}
      <PillButton
        label={t('bounty.detail.notSelected.browse')}
        onPress={onBrowse}
        testID="bounty-detail-browse"
      />
    </SheetActions>
  );
}

const styles = StyleSheet.create({
  selected: { fontWeight: '600', textAlign: 'center', paddingVertical: vars['--space-3'] },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars['--space-2'],
    paddingTop: vars['--space-3'],
  },
  shrink: { flexShrink: 1 },
  centred: { textAlign: 'center' },
});
