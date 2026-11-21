import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { SheetActions } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';

import type { OwnState } from './ownState';

export function PosterActions({
  own,
  onApplicants,
  onProgress,
}: {
  own: OwnState;
  onApplicants: () => void;
  onProgress: () => void;
}) {
  const { t } = useI18n();
  const line =
    own.kind === 'underway'
      ? t(`bounty.status.summary.poster.${own.step}`, {
          name: own.helper ?? t('bounty.post.unknownName'),
        })
      : t(`bounty.detail.poster.${own.kind}`);
  return (
    <SheetActions>
      <AppText
        variant="body"
        accessibilityRole="text"
        testID={`bounty-detail-own-${own.kind}`}
        style={styles.line}
      >
        {line}
      </AppText>
      {own.kind === 'underway' ? (
        <PillButton
          label={t('bounty.status.action.view')}
          onPress={onProgress}
          testID="bounty-detail-progress"
        />
      ) : (
        <PillButton
          label={t('bounty.detail.poster.applicants')}
          onPress={onApplicants}
          testID="bounty-detail-applicants"
        />
      )}
    </SheetActions>
  );
}

const styles = StyleSheet.create({
  line: { fontWeight: '600', textAlign: 'center', paddingVertical: vars['--space-3'] },
});
