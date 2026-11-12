import { SymbolView } from 'expo-symbols';
import { memo, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, PlatformColor, StyleSheet, View } from 'react-native';
import { ContextMenuView } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { space, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { bubbleMenu } from './bubbleMenu';
import { ImageBubble } from './ImageBubble';
import { askResend, copyMessage } from './messageActions';
import { ThreadActionsContext } from './threadActions';
import { canRetry, sameRow, type BubbleRow } from './threadView';
import { TranslatedText, TranslationStatus } from './TranslationParts';
import { useMessageTranslation } from './useMessageTranslation';

const SPINNER_DELAY_MS = 500;
const STATUS = vars['--touch-min'];
const RADIUS = vars['--radius-card'];

function useLate(active: boolean) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setLate(true), SPINNER_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setLate(false);
    };
  }, [active]);
  return active && late;
}

export const MessageBubble = memo(
  function MessageBubble({ row }: { row: BubbleRow }) {
    const { t, language } = useI18n();
    const { color } = useTheme();
    const actionsOf = useContext(ThreadActionsContext);
    const { translator } = actionsOf;
    const { item, mine, body, image } = row;
    const messageId =
      translator && item.kind === 'stored' && !mine && !row.folded && !image && body.trim() !== ''
        ? item.message.id
        : null;
    const translation = useMessageTranslation(translator, messageId, language);
    const translated = translation?.state === 'shown' ? translation.text : null;
    const pending = item.kind === 'pending' ? item.pending : null;
    const sending = pending?.state === 'sending';
    const late = useLate(sending);
    const said = image && body === '' ? t('chat.thread.image') : row.spoken;
    const spoken = row.speaker
      ? t('chat.list.from', { name: row.speaker, body: said })
      : t('chat.list.mine', { body: said });
    const label =
      pending?.state === 'failed'
        ? t('chat.thread.a11yFailed', { label: spoken })
        : pending
          ? t('chat.thread.a11ySending', { label: spoken })
          : translated !== null
            ? t('chat.thread.a11yTranslated', { label: spoken, translation: translated })
            : spoken;
    const reportTarget =
      item.kind === 'stored' && row.reportable
        ? { userId: item.message.senderId, messageId: item.message.id }
        : null;
    const actions = bubbleMenu(t, {
      translatable: messageId !== null,
      translation,
      reportable: reportTarget !== null,
    });
    const translate = () => {
      if (translator && messageId) translator.translate(messageId, body, language);
    };
    const act = (id: string) => {
      if (id === 'copy') copyMessage(body);
      if (id === 'translate') translate();
      if (id === 'hideTranslation' && translator && messageId) translator.hide(messageId, language);
      if (id === 'report' && reportTarget) actionsOf.report(reportTarget);
    };

    return (
      <View style={styles.row}>
        {row.timeBreak ? (
          <AppText variant="meta" tone="secondaryLabel" style={styles.break}>
            {row.timeBreak}
          </AppText>
        ) : null}
        {row.name ? (
          <AppText variant="meta" tone="secondaryLabel" style={styles.name}>
            {row.name}
          </AppText>
        ) : null}
        {row.folded ? (
          <View style={[styles.line, styles.theirs]}>
            <PressDim
              accessibilityRole="button"
              accessibilityLabel={t('chat.thread.foldedA11y')}
              testID={`chat-folded-${row.key}`}
              onPress={() => actionsOf.reveal(row.key)}
              style={[styles.folded, { borderColor: PlatformColor('separator') }]}
            >
              <AppText variant="secondary" tone="secondaryLabel" style={styles.foldedText}>
                {t('chat.thread.folded')}
              </AppText>
              <AppText variant="secondary" style={{ color: color('--color-accent') }}>
                {t('chat.thread.show')}
              </AppText>
            </PressDim>
          </View>
        ) : (
          <View style={[styles.line, mine ? styles.mine : styles.theirs]}>
            {pending?.state === 'failed' ? (
              <PressDim
                accessibilityRole="button"
                accessibilityLabel={
                  canRetry(pending.failure)
                    ? t('chat.thread.failed')
                    : t('chat.thread.undeliverable')
                }
                testID={`chat-retry-${row.key}`}
                style={styles.status}
                onPress={() => askResend(pending, t)}
              >
                <SymbolView
                  name="exclamationmark.circle.fill"
                  size={STATUS / 2}
                  tintColor={color('--color-urgent')}
                />
              </PressDim>
            ) : null}
            {sending ? (
              <View style={styles.spinner}>
                {late ? <ActivityIndicator testID={`chat-sending-${row.key}`} /> : null}
              </View>
            ) : null}
            {image ? (
              <ImageBubble
                image={image}
                label={label}
                testID={`chat-bubble-${row.key}`}
                report={reportTarget ? () => actionsOf.report(reportTarget) : null}
              />
            ) : (
              <ContextMenuView
                actions={actions}
                cornerRadius={RADIUS}
                onAction={act}
                style={styles.menu}
              >
                <View
                  accessible
                  accessibilityLabel={label}
                  accessibilityActions={actions.map((action) => ({
                    name: action.id,
                    label: action.title,
                  }))}
                  onAccessibilityAction={(event) => act(event.nativeEvent.actionName)}
                  testID={`chat-bubble-${row.key}`}
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: mine
                        ? color('--color-accent')
                        : PlatformColor('secondarySystemFill'),
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={mine ? { color: color('--color-on-accent') } : undefined}
                  >
                    {body}
                  </AppText>
                  {translated !== null ? (
                    <TranslatedText text={translated} testID={`chat-translation-${row.key}`} />
                  ) : null}
                </View>
              </ContextMenuView>
            )}
          </View>
        )}
        {translation && translation.state !== 'shown' && translator ? (
          <TranslationStatus
            translation={translation}
            rowKey={row.key}
            onRetry={translate}
            onFeed={translator.feed}
          />
        ) : null}
        {pending?.state === 'failed' && !canRetry(pending.failure) ? (
          <AppText
            variant="meta"
            style={[styles.refused, { color: color('--color-urgent') }]}
            testID={`chat-refused-${row.key}`}
          >
            {t('chat.thread.refused')}
          </AppText>
        ) : null}
        {row.read ? (
          <AppText
            variant="meta"
            tone="secondaryLabel"
            style={styles.read}
            testID={`chat-read-${row.key}`}
          >
            {row.read}
          </AppText>
        ) : null}
      </View>
    );
  },
  (before, after) => sameRow(before.row, after.row),
);

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.md, paddingVertical: space.xs / 2 },
  line: { flexDirection: 'row', alignItems: 'center' },
  mine: { justifyContent: 'flex-end', paddingLeft: space.xxxl * 2 },
  theirs: { justifyContent: 'flex-start', paddingRight: space.xxxl * 2 },
  menu: { flexShrink: 1, borderRadius: RADIUS },
  bubble: {
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  status: { width: STATUS, height: STATUS, alignItems: 'center', justifyContent: 'center' },
  spinner: { width: STATUS / 2, marginRight: space.xs },
  break: { textAlign: 'center', paddingVertical: space.sm },
  name: { paddingLeft: space.md, paddingBottom: 2 },
  read: { textAlign: 'right', paddingTop: space.xs / 2, paddingRight: space.xs },
  refused: { textAlign: 'right', paddingTop: space.xs / 2, paddingRight: space.xs },
  folded: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    gap: space.sm,
    minHeight: vars['--touch-min'],
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: 'dashed',
  },
  foldedText: { flexShrink: 1 },
});
