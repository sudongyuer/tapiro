import { PlatformColor, StyleSheet, View } from 'react-native';

import type { BountyDraft } from '@/lib/drafts/bountyDraft';
import { useI18n } from '@/lib/i18n';
import type { CurrencyCode } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { AskReply, PickItem } from './askReply';
import type { UserTurn } from './conversation';
import { draftLines } from './draftLines';

export function UserBubble({ turn, testID }: { turn: UserTurn; testID: string }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const text =
    turn.via === 'image'
      ? [t('ask.sheet.image'), turn.text].filter(Boolean).join(' · ')
      : turn.text;
  return (
    <View style={[styles.user, { backgroundColor: color('--color-accent') }]} testID={testID}>
      <AppText variant="body" style={{ color: color('--color-on-accent') }}>
        {text}
      </AppText>
    </View>
  );
}

function Chip({
  label,
  disabled,
  onPress,
  testID,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <PressDim
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[styles.chip, { backgroundColor: PlatformColor('tertiarySystemFill') }]}
    >
      <AppText variant="secondary">{label}</AppText>
    </PressDim>
  );
}

function DraftCard({
  draft,
  currency,
  onFill,
  testID,
}: {
  draft: BountyDraft;
  currency: CurrencyCode;
  onFill: (draft: BountyDraft) => void;
  testID: string;
}) {
  const { t, language } = useI18n();
  return (
    <>
      <AppText variant="meta" tone="secondaryLabel">
        {t('ask.sheet.draftHeader')}
      </AppText>
      <AppText variant="title" testID={`${testID}-title`}>
        {draft.title}
      </AppText>
      {draftLines(draft, t, language, currency).map((line) => (
        <AppText key={line} variant="secondary" tone="secondaryLabel">
          {line}
        </AppText>
      ))}
      {draft.description ? (
        <AppText variant="secondary" numberOfLines={3} testID={`${testID}-description`}>
          {draft.description}
        </AppText>
      ) : null}
      <View style={styles.action}>
        <PillButton
          label={t('ask.sheet.fill')}
          onPress={() => onFill(draft)}
          testID={`${testID}-fill`}
        />
      </View>
    </>
  );
}

export function TapirCard({
  reply,
  latest,
  busy,
  currency,
  onChoose,
  onPick,
  onFill,
  testID,
}: {
  reply: AskReply;
  latest: boolean;
  busy: boolean;
  currency: CurrencyCode;
  onChoose: (answer: string) => void;
  onPick: (item: PickItem) => void;
  onFill: (draft: BountyDraft) => void;
  testID: string;
}) {
  const { t } = useI18n();
  const closed = !latest || busy;
  return (
    <View
      style={[styles.card, { backgroundColor: PlatformColor('secondarySystemBackground') }]}
      testID={testID}
    >
      {reply.kind === 'answer' ? (
        <AppText variant="body" testID={`${testID}-text`}>
          {reply.text}
        </AppText>
      ) : null}
      {reply.kind === 'clarify' ? (
        <>
          <AppText variant="body" testID={`${testID}-question`}>
            {reply.question}
          </AppText>
          <View style={styles.chips}>
            {[...reply.choices, t('ask.sheet.skip')].map((choice, index) => (
              <Chip
                key={`${index}-${choice}`}
                label={choice}
                disabled={closed}
                onPress={() => onChoose(choice)}
                testID={`${testID}-choice-${index}`}
              />
            ))}
          </View>
        </>
      ) : null}
      {reply.kind === 'pick' ? (
        <>
          <AppText variant="body">{t('ask.sheet.pick', { count: reply.items.length })}</AppText>
          {reply.items.map((item, index) => (
            <PressDim
              key={`${index}-${item.summary}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: closed }}
              disabled={closed}
              onPress={() => onPick(item)}
              testID={`${testID}-item-${index}`}
              style={[styles.item, { backgroundColor: PlatformColor('systemBackground') }]}
            >
              <AppText variant="body">{item.summary}</AppText>
            </PressDim>
          ))}
        </>
      ) : null}
      {reply.kind === 'draft' ? (
        <DraftCard draft={reply.draft} currency={currency} onFill={onFill} testID={testID} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  user: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    paddingHorizontal: vars['--space-4'],
    paddingVertical: vars['--space-2'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  card: {
    gap: vars['--space-2'],
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
  chip: {
    minHeight: vars['--touch-min'],
    justifyContent: 'center',
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
  },
  item: {
    minHeight: vars['--touch-min'],
    justifyContent: 'center',
    paddingHorizontal: vars['--space-4'],
    paddingVertical: vars['--space-2'],
    borderRadius: vars['--radius-chip'],
    borderCurve: 'continuous',
  },
  action: { alignItems: 'flex-start', marginTop: vars['--space-1'] },
});
