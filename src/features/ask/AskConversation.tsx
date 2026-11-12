import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ActivityIndicator, PlatformColor, StyleSheet, View } from 'react-native';

import type { BountyDraft } from '@/lib/drafts/bountyDraft';
import { useI18n } from '@/lib/i18n';
import type { CurrencyCode } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { PillButton } from '@/ui/PillButton';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';

import type { PickItem } from './askReply';
import type { AskFailure, AskSessionState } from './askSession';
import { resumeLine } from './conversation';
import { TapirCard, UserBubble } from './TurnCards';

type ShownFailure = Exclude<AskFailure, 'hungry'>;

const FAILURE_KEYS = {
  offline: 'ask.composer.offline',
  providerError: 'ask.sheet.providerError',
  unreadable: 'ask.sheet.unreadable',
  busy: 'ask.sheet.busy',
} as const satisfies Record<ShownFailure, string>;

export type AskActions = {
  onResume: () => void;
  onChoose: (answer: string) => void;
  onPick: (item: PickItem) => void;
  onFill: (draft: BountyDraft) => void;
  onRetry: () => void;
  onManual: () => void;
};

function FailureCard({
  reason,
  onRetry,
  onManual,
}: {
  reason: ShownFailure;
  onRetry: () => void;
  onManual: () => void;
}) {
  const { t } = useI18n();
  return (
    <View
      style={[styles.failure, { backgroundColor: PlatformColor('secondarySystemBackground') }]}
      testID={`ask-failure-${reason}`}
    >
      <View style={styles.failureText}>
        <Mascot variant="side" size={vars['--touch-min']} />
        <AppText variant="body" style={styles.grow} testID="ask-failure-text">
          {t(FAILURE_KEYS[reason])}
        </AppText>
      </View>
      <View style={styles.buttons}>
        <PillButton label={t('ask.sheet.retry')} onPress={onRetry} testID="ask-retry" />
        <PillButton
          label={t('ask.sheet.manual')}
          variant="secondary"
          onPress={onManual}
          testID="ask-manual"
        />
      </View>
    </View>
  );
}

export function AskConversation({
  state,
  currency,
  actions,
  hungry,
}: {
  state: AskSessionState;
  currency: CurrencyCode;
  actions: AskActions;
  hungry: ReactNode;
}) {
  const { t } = useI18n();
  const resume = state.turns.length === 0 ? resumeLine(state.resume) : null;
  const last = state.turns.length - 1;
  return (
    <View style={styles.list}>
      {resume ? (
        <PressDim
          accessibilityRole="button"
          accessibilityLabel={t('ask.sheet.resume', { text: resume })}
          accessibilityHint={t('ask.sheet.resumeHint')}
          onPress={actions.onResume}
          testID="ask-resume"
          style={[styles.resume, { backgroundColor: PlatformColor('secondarySystemBackground') }]}
        >
          <AppText variant="secondary" tone="secondaryLabel" numberOfLines={1} style={styles.grow}>
            {t('ask.sheet.resume', { text: resume })}
          </AppText>
          <SymbolView name="chevron.right" size={13} tintColor={PlatformColor('tertiaryLabel')} />
        </PressDim>
      ) : null}
      {state.turns.map((turn, index) =>
        turn.role === 'user' ? (
          <UserBubble key={index} turn={turn} testID={`ask-turn-${index}`} />
        ) : (
          <TapirCard
            key={index}
            reply={turn.reply}
            latest={index === last}
            busy={state.sending !== null}
            currency={currency}
            onChoose={actions.onChoose}
            onPick={actions.onPick}
            onFill={actions.onFill}
            testID={`ask-turn-${index}`}
          />
        ),
      )}
      {state.sending ? (
        <View style={styles.thinking} testID="ask-thinking">
          <ActivityIndicator />
          <AppText variant="secondary" tone="secondaryLabel">
            {t('ask.sheet.thinking')}
          </AppText>
        </View>
      ) : null}
      {state.failed && state.failed.reason !== 'hungry' ? (
        <FailureCard
          reason={state.failed.reason}
          onRetry={actions.onRetry}
          onManual={actions.onManual}
        />
      ) : null}
      {hungry}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: vars['--space-3'] },
  grow: { flex: 1 },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-2'],
    minHeight: vars['--touch-min'],
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  failure: {
    gap: vars['--space-3'],
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  failureText: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
});
