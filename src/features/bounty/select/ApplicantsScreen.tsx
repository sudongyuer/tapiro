import { ProgressView, Section } from '@expo/ui/swift-ui';
import { accessibilityIdentifier, accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { useEffect, useRef } from 'react';
import { Alert, PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { SheetFrame } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';

import { useBlockPerson } from '../block/hooks';
import { malaysiaClock } from '../board/malaysiaClock';
import { selectedHelper } from './applicantsController';
import { ApplicantSection, ApplicantsHeader, StateRow } from './ApplicantRows';
import { applicantsView } from './applicantsView';
import { SelectedSummary } from './SelectedSummary';
import { SelectFooter } from './SelectFooter';
import { doneTitle, raceBody, statusCopy } from './selectCopy';
import { statusLine, type SendState } from './selectState';
import { useApplicants } from './useApplicants';

function useRaceAlert(send: SendState, acknowledge: () => void) {
  const { t } = useI18n();
  const shown = useRef<SendState | null>(null);
  useEffect(() => {
    if (send.kind !== 'raced' || shown.current === send) return;
    shown.current = send;
    Alert.alert(t('bounty.select.race.title'), raceBody(send.helper?.name ?? null, t), [
      { text: t('bounty.select.race.ok'), onPress: acknowledge },
    ]);
  }, [send, acknowledge, t]);
}

export function ApplicantsScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useI18n();
  const model = useApplicants(id);
  const view = applicantsView(model, new Date());
  const { list, chosen, send } = model.select;
  useRaceAlert(send, model.acknowledgeRace);
  const blocking = useBlockPerson('applicant');
  const footer =
    view.footer?.state === 'ready' && blocking.state === 'busy'
      ? { state: 'disabled' as const, others: view.footer.others }
      : view.footer;

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
  const helper = selectedHelper(model);
  const retry = {
    label: t('bounty.select.retry'),
    onPress: () => void model.retry(),
    testID: 'bounty-applicants-retry',
  };

  return (
    <SheetFrame testID="bounty-applicants" pinnedAbove="tabBar">
      {view.body === 'done' ? (
        <ApplicantsHeader detail={detail} status={doneTitle(helper, t)} done />
      ) : (
        <ApplicantsHeader
          detail={detail}
          status={view.body === 'closed' ? null : statusCopy(statusLine(list), t)}
        />
      )}
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
      {blocking.state === 'failed' ? (
        <StateRow>
          <InlineState
            tone="warning"
            text={t('bounty.block.failed')}
            testID="bounty-applicants-block-failed"
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
      ) : view.body === 'done' ? (
        <SelectedSummary helper={helper} detail={model.detail} onRetry={() => void model.retry()} />
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
        <ApplicantSection
          applicants={view.applicants}
          chosen={chosen}
          blocking={blocking.target}
          canBlock={blocking.state !== 'busy' && (send.kind === 'idle' || send.kind === 'failed')}
          onChoose={model.chose}
          onBlock={blocking.ask}
        />
      )}
      {footer || view.notice ? (
        <SelectFooter footer={footer} notice={view.notice} onHold={() => void model.send()} />
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
