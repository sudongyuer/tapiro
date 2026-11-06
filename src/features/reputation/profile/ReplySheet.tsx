import { Form, Host, HStack, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  fixedSize,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useProfileReview, useReplyState } from '../hooks';
import { cleanText, textLength } from '../model';
import { profileStore } from '../services';
import { REVIEW_TEXT_MAX } from '../types';
import { reviewLine } from './profileView';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const wraps = fixedSize({ horizontal: false, vertical: true });

export function ReplySheet({
  personId,
  reviewId,
  onClose,
}: {
  personId: string;
  reviewId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const review = useProfileReview(personId, reviewId);
  const state = useReplyState(reviewId);
  const [typed, setTyped] = useState(() => profileStore.replyDraft(reviewId));
  const field = useSyncedText(typed, (text) => {
    setTyped(text);
    profileStore.saveReplyDraft(reviewId, text);
  });
  const sending = state?.phase === 'sending';
  const count = textLength(typed);
  const ready =
    cleanText(typed) !== '' && count <= REVIEW_TEXT_MAX && !sending && review?.reply == null;

  useEffect(() => {
    profileStore.dismissReplyFailure(reviewId);
  }, [reviewId]);

  const send = async () => {
    Keyboard.dismiss();
    if (await profileStore.reply(reviewId, field.sync())) onClose();
  };

  const confirm = () => {
    if (!ready) return;
    field.sync();
    Alert.alert(t('reputation.reply.confirm'), undefined, [
      { text: t('reputation.reply.confirmCancel'), style: 'cancel' },
      { text: t('reputation.reply.confirmSend'), onPress: () => void send() },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('reputation.reply.title'), gestureEnabled: !sending }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button disabled={sending} onPress={onClose}>
          {t('reputation.reply.cancel')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {sending ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.View>
            <ActivityIndicator
              accessible
              accessibilityLabel={t('reputation.reply.sending')}
              testID="profile-reply-sending"
              style={styles.busy}
            />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            variant="prominent"
            tintColor={color('--color-accent')}
            disabled={!ready}
            onPress={confirm}
          >
            {t('reputation.reply.send')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
      <Host style={styles.host} testID="profile-reply">
        <Form modifiers={[tint(color('--color-accent'))]}>
          {state?.phase === 'failed' ? (
            <NoticeCard
              tone="urgent"
              icon="exclamationmark.circle.fill"
              title={t(`reputation.reply.${state.failure}`)}
              testID="profile-reply-failed"
            />
          ) : null}
          {review ? (
            <Section title={t('reputation.reply.replyingTo')}>
              <Text modifiers={[wraps, accessibilityIdentifier('profile-reply-quote')]}>
                {reviewLine(review, t)}
              </Text>
              {review.sentence ? (
                <Text modifiers={[secondary, wraps, lineLimit(4)]}>{review.sentence}</Text>
              ) : null}
            </Section>
          ) : null}
          <Section footer={<Text>{t('reputation.reply.confirm')}</Text>}>
            <SyncedTextField
              field={field}
              axis="vertical"
              placeholder={t('reputation.reply.placeholder')}
              testID="profile-reply-input"
              modifiers={[
                lineLimit({ min: 3, max: 8 }),
                accessibilityLabel(t('reputation.reply.placeholder')),
                disabled(sending),
              ]}
            />
            <HStack spacing={0}>
              <Spacer />
              <Text
                modifiers={[
                  count > REVIEW_TEXT_MAX ? foregroundStyle(color('--color-urgent')) : secondary,
                  monospacedDigit(),
                  accessibilityLabel(
                    t('reputation.reply.countLabel', { count, max: REVIEW_TEXT_MAX }),
                  ),
                  accessibilityIdentifier('profile-reply-count'),
                ]}
              >
                {t('reputation.reply.count', { count, max: REVIEW_TEXT_MAX })}
              </Text>
            </HStack>
          </Section>
        </Form>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  busy: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});
