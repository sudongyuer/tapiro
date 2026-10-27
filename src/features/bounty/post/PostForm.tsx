import {
  Button,
  ConfirmationDialog,
  Form,
  Host,
  Label,
  Picker,
  Section,
  Spacer,
  Text,
  TextField,
  useNativeState,
  type TextFieldRef,
} from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  foregroundStyle,
  frame,
  keyboardType,
  monospacedDigit,
  multilineTextAlignment,
  pickerStyle,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { BOUNTY_CATEGORIES, bountyCategory } from '@/lib/stickers/category';
import { CATEGORY_SYMBOLS } from '@/ui/CategorySticker';
import { NoticeCard } from '@/ui/NoticeCard';
import { useTheme } from '@/ui/theme/useTheme';

import { errorKey } from './errorCopy';
import { FieldRow, fullRow, ROW_INSETS } from './FieldRow';
import { DescriptionRows, TimeRows } from './OptionalRows';
import { draftStore } from './services';
import type { DraftError, PostDraft } from './types';
import { resetDraft, useDraft } from './useDraft';
import { codePoints, checkDraft, REWARD_MAX_RM, REWARD_MIN_RM, TITLE_MAX } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const REWARD_DIGITS = String(REWARD_MAX_RM).length;
const REWARD_FIELD_WIDTH = 96;

type FormProps = { userId: string; onNext: () => void; onClose: () => void };

export function PostForm(props: FormProps) {
  const draft = useDraft(props.userId);
  return <PostFormBody key={draft.id} draft={draft} {...props} />;
}

function PostFormBody({ userId, draft, onNext, onClose }: FormProps & { draft: PostDraft }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const title = useNativeState(draft.title);
  const reward = useNativeState(draft.rewardText);
  const description = useNativeState(draft.description ?? '');
  const titleField = useRef<TextFieldRef>(null);
  const rewardField = useRef<TextFieldRef>(null);
  const [error, setError] = useState<DraftError | null>(null);
  const shown = error ? errorKey(error) : null;

  function edit(patch: Partial<PostDraft>) {
    draftStore.update(userId, patch);
    setError(null);
  }

  // onTextChange can miss the last keystroke when keys arrive faster than SwiftUI's change handler runs; the
  // native values are read back before anything depends on the stored draft.
  function sync() {
    const stored = draftStore.load(userId);
    const typed: Partial<PostDraft> = {
      title: title.get(),
      rewardText: reward.get(),
      description: stored.description === null ? null : description.get(),
    };
    const changed = (Object.keys(typed) as (keyof typeof typed)[]).some(
      (key) => typed[key] !== stored[key],
    );
    if (changed) draftStore.update(userId, typed);
  }

  const onBlur = (focused: boolean) => {
    if (!focused) sync();
  };

  function next() {
    sync();
    const checked = checkDraft(draftStore.load(userId), new Date());
    if (!checked.ok) return setError(checked.error);
    setError(null);
    onNext();
  }

  return (
    <Host style={styles.host} testID="bounty-post-form">
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          onPress={() => {
            sync();
            onClose();
          }}
        >
          {t('bounty.post.cancel')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          variant="prominent"
          tintColor={color('--color-accent')}
          onPress={next}
        >
          {t('bounty.post.next')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Form modifiers={[tint(color('--color-accent'))]}>
        {shown ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t(shown.key, shown.values)}
            testID="bounty-post-error"
          />
        ) : null}
        <Section>
          <FieldRow field={titleField}>
            <TextField
              ref={titleField}
              text={title}
              maxLength={TITLE_MAX}
              placeholder={t('bounty.post.form.titlePlaceholder')}
              onTextChange={(text) => edit({ title: text })}
              onFocusChange={onBlur}
              testID="bounty-post-title"
            />
            <Text
              modifiers={[
                secondary,
                monospacedDigit(),
                accessibilityLabel(
                  t('bounty.post.form.countLabel', {
                    count: codePoints(draft.title),
                    max: TITLE_MAX,
                  }),
                ),
                accessibilityIdentifier('bounty-post-title-count'),
              ]}
            >
              {t('bounty.post.form.count', { count: codePoints(draft.title), max: TITLE_MAX })}
            </Text>
          </FieldRow>
        </Section>
        <Section
          footer={
            <Text>
              {t('bounty.post.form.rewardFooter', { min: REWARD_MIN_RM, max: REWARD_MAX_RM })}
            </Text>
          }
        >
          <Picker
            label={t('bounty.post.form.category')}
            selection={draft.category ?? ''}
            onSelectionChange={(next: string) => {
              const category = bountyCategory(next);
              if (category) edit({ category });
            }}
            testID="bounty-post-category"
            modifiers={[pickerStyle('menu'), fullRow, ROW_INSETS]}
          >
            {draft.category === null ? (
              <Text modifiers={[tag('')]}>{t('bounty.post.form.categoryPlaceholder')}</Text>
            ) : null}
            {BOUNTY_CATEGORIES.map((category) => (
              <Label
                key={category}
                title={t(`bounty.category.${category}`)}
                systemImage={CATEGORY_SYMBOLS[category]}
                modifiers={[tag(category)]}
              />
            ))}
          </Picker>
          <FieldRow field={rewardField}>
            <Text>{t('bounty.post.form.reward')}</Text>
            <Spacer />
            <Text modifiers={[secondary]}>{t('bounty.post.form.rewardUnit')}</Text>
            <TextField
              ref={rewardField}
              text={reward}
              maxLength={REWARD_DIGITS}
              placeholder={t('bounty.post.form.rewardPlaceholder', {
                min: REWARD_MIN_RM,
                max: REWARD_MAX_RM,
              })}
              onTextChange={(text) => edit({ rewardText: text })}
              onFocusChange={onBlur}
              testID="bounty-post-reward"
              modifiers={[
                keyboardType('numeric'),
                multilineTextAlignment('trailing'),
                frame({ width: REWARD_FIELD_WIDTH }),
                accessibilityLabel(t('bounty.post.form.reward')),
              ]}
            />
          </FieldRow>
        </Section>
        <Section
          header={<Text>{t('bounty.post.form.detailsHeader')}</Text>}
          footer={<Text>{t('bounty.post.form.draftFooter')}</Text>}
        >
          <TimeRows time={draft.time} onEdit={edit} />
          <DescriptionRows
            description={draft.description}
            text={description}
            onBlur={onBlur}
            onEdit={edit}
          />
        </Section>
        <ClearSection
          userId={userId}
          empty={draftStore.isEmpty(draft)}
          onCleared={() => setError(null)}
        />
      </Form>
    </Host>
  );
}

function ClearSection({
  userId,
  empty,
  onCleared,
}: {
  userId: string;
  empty: boolean;
  onCleared: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [asking, setAsking] = useState(false);
  if (empty) return null;
  return (
    <Section>
      <ConfirmationDialog
        title={t('bounty.post.form.clearConfirm.title')}
        titleVisibility="visible"
        isPresented={asking}
        onIsPresentedChange={setAsking}
      >
        <ConfirmationDialog.Trigger>
          <Button
            label={t('bounty.post.form.clear')}
            role="destructive"
            onPress={() => setAsking(true)}
            testID="bounty-post-clear"
            modifiers={[foregroundStyle(color('--color-urgent')), fullRow, ROW_INSETS]}
          />
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button
            label={t('bounty.post.form.clearConfirm.confirm')}
            role="destructive"
            onPress={() => {
              resetDraft(userId);
              onCleared();
            }}
          />
          <Button label={t('bounty.post.form.clearConfirm.cancel')} role="cancel" />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <Text>{t('bounty.post.form.clearConfirm.message')}</Text>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Section>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
