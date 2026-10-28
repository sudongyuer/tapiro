import { ProgressView, Section } from '@expo/ui/swift-ui';
import { accessibilityIdentifier, accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { SheetFrame } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';

import { malaysiaClock } from '../board/malaysiaClock';
import { ApplicantSection, ApplicantsHeader, StateRow } from './ApplicantRows';
import { applicantsView } from './applicantsView';
import { SelectFooter } from './SelectFooter';
import { statusCopy } from './selectCopy';
import { statusLine } from './selectState';
import { useApplicants } from './useApplicants';

export function ApplicantsScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useI18n();
  const model = useApplicants(id);
  const view = applicantsView(model, new Date());
  const { list, chosen } = model.select;

  if (view.body === 'gone') {
    return (
      <View style={styles.gone}>
        <InlineState
          text={t('bounty.detail.gone')}
          action={{
            label: t('bounty.select.back'),
            onPress: onBack,
            testID: 'bounty-applicants-back',
          }}
          testID="bounty-applicants-gone"
        />
      </View>
    );
  }

  const detail = model.detail.kind === 'ready' ? model.detail.detail : null;
  const retry = {
    label: t('bounty.select.retry'),
    onPress: () => void model.retry(),
    testID: 'bounty-applicants-retry',
  };

  return (
    <SheetFrame testID="bounty-applicants" pinnedAbove="tabBar">
      <ApplicantsHeader detail={detail} status={statusCopy(statusLine(list), t)} />
      {view.stale ? (
        <StateRow>
          <InlineState
            tone="warning"
            text={t('bounty.select.refreshFailed', { time: malaysiaClock(view.stale.loadedAt) })}
            action={{ ...retry, busy: view.stale.refreshing }}
            testID="bounty-applicants-stale"
          />
        </StateRow>
      ) : null}
      {view.body === 'closed' ? (
        <StateRow>
          <InlineState
            text={t('bounty.select.closed')}
            action={{
              label: t('bounty.select.back'),
              onPress: onBack,
              testID: 'bounty-applicants-back',
            }}
            testID="bounty-applicants-closed"
          />
        </StateRow>
      ) : view.body === 'failed' ? (
        <StateRow>
          <InlineState
            text={t('bounty.select.failed')}
            action={{ ...retry, busy: list.kind === 'failed' && list.retrying }}
            testID="bounty-applicants-failed"
          />
        </StateRow>
      ) : view.body === 'empty' ? (
        <StateRow>
          <InlineState
            text={[t('bounty.select.empty.title'), t('bounty.select.empty.body')].join('\n')}
            testID="bounty-applicants-empty"
          />
        </StateRow>
      ) : view.body === 'loading' ? (
        <Section>
          <ProgressView
            modifiers={[
              accessibilityLabel(t('bounty.select.loading')),
              accessibilityIdentifier('bounty-applicants-loading'),
            ]}
          />
        </Section>
      ) : (
        <ApplicantSection applicants={view.applicants} chosen={chosen} onChoose={model.chose} />
      )}
      {view.footer ? (
        <SelectFooter
          footer={view.footer}
          onHold={() => void model.send()}
          onAccessibilityActivate={() => void model.send()}
        />
      ) : null}
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  gone: {
    flex: 1,
    justifyContent: 'center',
    padding: vars['--space-4'],
    backgroundColor: PlatformColor('systemGroupedBackground'),
  },
});
