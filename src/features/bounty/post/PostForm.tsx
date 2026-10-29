import {
  Button,
  ConfirmationDialog,
  Form,
  Host,
  Label,
  Picker,
  Section,
  Text,
  type TextFieldRef,
} from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  foregroundStyle,
  monospacedDigit,
  pickerStyle,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { CurrencyCode } from '@/lib/money';
import { BOUNTY_CATEGORIES, bountyCategory } from '@/lib/stickers/category';
import { CATEGORY_SYMBOLS } from '@/ui/CategorySticker';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { useTheme } from '@/ui/theme/useTheme';

import { FieldRow, fullRow, ROW_INSETS } from './FieldRow';
import { FormNotice } from './FormNotice';
import { DescriptionRows, TimeRows } from './OptionalRows';
import { AddPlaceRow, PlaceSections } from './PlaceRows';
import { draftStore } from './services';
import type { PostDraft } from './types';
import { formError, resetDraft, useDraft, useFormError } from './useDraft';
import { useDraftSync } from './useDraftSync';
import { usePlaceFields } from './usePlaceFields';
import { useHintFocus } from './useStartPost';
import { useSentCheck } from './useSentCheck';
import { rewardRangeText } from './errorCopy';
import { RewardRow } from './RewardRow';
import { codePoints, checkDraft, TITLE_MAX } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

type FormProps = {
  userId: string;
  onNext: () => void;
  onClose: () => void;
  onPickPlace: () => void;
};

export function PostForm(props: FormProps) {
  const draft = useDraft(props.userId);
  useHintFocus(useIsFocused());
  useEffect(() => () => formError.set(null), []);
  useSentCheck(props.userId, draft);
  return <PostFormBody key={draft.id} draft={draft} {...props} />;
}

function PostFormBody({
  userId,
  draft,
  onNext,
  onClose,
  onPickPlace,
}: FormProps & { draft: PostDraft }) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  function edit(patch: Partial<PostDraft>) {
    draftStore.update(userId, patch);
    formError.set(null);
  }

  const title = useSyncedText(draft.title, (text) => edit({ title: text }));
  const reward = useSyncedText(draft.rewardText, (text) => edit({ rewardText: text }));
  const description = useSyncedText(draft.description ?? '', (text) => edit({ description: text }));
  const titleField = useRef<TextFieldRef>(null);
  const notice = useFormError();
  const clearError = useCallback(() => formError.set(null), []);
  const place = usePlaceFields(userId, draft.place, clearError);

  const sync = useDraftSync(userId, draft.id, {
    title,
    reward,
    description,
    placeLabel: place.label,
    address: place.address,
  });

  function pickPlace() {
    sync();
    onPickPlace();
  }

  const onBlur = (focused: boolean) => {
    if (!focused) sync();
  };

  function chooseCurrency(currency: CurrencyCode) {
    sync();
    const shown = formError.get();
    draftStore.update(userId, { currency });
    const checked = checkDraft(draftStore.load(userId), new Date());
    const recheck = shown !== null && shown !== 'alreadySent';
    formError.set(recheck && !checked.ok ? checked.error : null);
  }

  function next() {
    sync();
    const checked = checkDraft(draftStore.load(userId), new Date());
    if (!checked.ok) return formError.set(checked.error);
    formError.set(null);
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
        <FormNotice notice={notice} currency={draft.currency} />
        <Section>
          <FieldRow field={titleField}>
            <SyncedTextField
              ref={titleField}
              field={title}
              maxLength={TITLE_MAX}
              placeholder={t('bounty.post.form.titlePlaceholder')}
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
            <Text modifiers={[accessibilityIdentifier('bounty-post-reward-footer')]}>
              {t('bounty.post.form.rewardFooter', {
                range: rewardRangeText(language, draft.currency),
              })}
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
          <RewardRow
            field={reward}
            currency={draft.currency}
            onCurrency={chooseCurrency}
            onBlur={onBlur}
          />
        </Section>
        <Section
          header={<Text>{t('bounty.post.form.detailsHeader')}</Text>}
          footer={<Text>{t('bounty.post.form.draftFooter')}</Text>}
        >
          <TimeRows time={draft.time} onEdit={edit} />
          <DescriptionRows
            description={draft.description}
            field={description}
            onBlur={onBlur}
            onEdit={edit}
          />
          {draft.place === null ? <AddPlaceRow onPick={pickPlace} /> : null}
        </Section>
        {draft.place ? (
          <PlaceSections
            place={draft.place}
            label={place.label}
            address={place.address}
            focusLabel={place.focusLabel}
            onPick={pickPlace}
            onBlur={onBlur}
            onRemove={place.remove}
          />
        ) : null}
        <ClearSection userId={userId} empty={draftStore.isEmpty(draft)} />
      </Form>
    </Host>
  );
}

function ClearSection({ userId, empty }: { userId: string; empty: boolean }) {
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
            onPress={() => resetDraft(userId)}
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
