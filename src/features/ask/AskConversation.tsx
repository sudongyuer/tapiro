import { SymbolView } from 'expo-symbols';
import { Fragment, type ReactNode } from 'react';
import { ActivityIndicator, PlatformColor, StyleSheet, View } from 'react-native';

import type { BountyDraft } from '@/lib/drafts/bountyDraft';
import { useI18n } from '@/lib/i18n';
import type { CurrencyCode } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useSheetFill } from '@/ui/theme/useSheetFill';

import type { PickItem } from './askReply';
import type { AskFailure, AskSessionState } from './askSession';
import { resumeLine } from './conversation';
import { FailureCard } from './FailureCard';
import { OfferCard } from './MemoryCards';
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
  onEditMemory: (id: string) => void;
};

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
  const fill = useSheetFill();
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
          style={[styles.resume, { backgroundColor: fill }]}
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
          <Fragment key={index}>
            <TapirCard
              reply={turn.reply}
              memory={turn.memory}
              latest={index === last}
              busy={state.sending !== null}
              currency={currency}
              onChoose={actions.onChoose}
              onPick={actions.onPick}
              onFill={actions.onFill}
              onEditMemory={actions.onEditMemory}
              testID={`ask-turn-${index}`}
            />
            {state.userId ? (
              <OfferCard userId={state.userId} turn={turn} testID={`ask-offer-${index}`} />
            ) : null}
          </Fragment>
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
          text={t(FAILURE_KEYS[state.failed.reason])}
          dizzy={state.failed.reason !== 'busy'}
          testID={`ask-failure-${state.failed.reason}`}
          textTestID="ask-failure-text"
        >
          <PillButton label={t('ask.sheet.retry')} onPress={actions.onRetry} testID="ask-retry" />
          <PillButton
            label={t('ask.sheet.manual')}
            variant="secondary"
            onPress={actions.onManual}
            testID="ask-manual"
          />
        </FailureCard>
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
});
