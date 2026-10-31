import { Form, Host, Section, Text, type TextFieldRef } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  foregroundStyle,
  monospacedDigit,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { CurrencyCode } from '@/lib/money';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { useTheme } from '@/ui/theme/useTheme';

import { CategoryRow } from './CategoryRow';
import { ClearSection } from './ClearSection';
import { FieldRow } from './FieldRow';
import { FormNotice } from './FormNotice';
import { useKindCopy } from './kindCopy';
import { PostLiveCard } from './PostArt';
import { DescriptionRows, TimeRows } from './OptionalRows';
import { AddPlaceRow, PlaceSections } from './PlaceRows';
import { RewardSection } from './RewardSection';
import { draftStore } from './services';
import { titlePatch } from './titleEdit';
import type { PostDraft } from './types';
import { formError, useDraft, useFormError } from './useDraft';
import { useDraftSync } from './useDraftSync';
import { usePlaceFields } from './usePlaceFields';
import { useHintFocus } from './useStartPost';
import { useSentCheck } from './useSentCheck';
import { codePoints, checkDraft, TITLE_MAX } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

const TITLE_COUNT_FROM = TITLE_MAX - 10;

type FormProps = {
  userId: string;
  onNext: () => void;
  onCleared: () => void;
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
  onCleared,
  onPickPlace,
}: FormProps & { draft: PostDraft }) {
  const { t } = useI18n();
  const copy = useKindCopy(draft.category);
  const { color } = useTheme();
  function edit(patch: Partial<PostDraft>) {
    draftStore.update(userId, patch);
    formError.set(null);
  }

  const title = useSyncedText(draft.title, (text) =>
    edit(titlePatch(draftStore.load(userId), text)),
  );
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
        <PostLiveCard draft={draft} onSwap={(art) => edit({ art })} />
        <Section>
          <FieldRow field={titleField}>
            <SyncedTextField
              ref={titleField}
              field={title}
              maxLength={TITLE_MAX}
              placeholder={copy.title}
              onFocusChange={onBlur}
              testID="bounty-post-title"
            />
            {codePoints(draft.title) >= TITLE_COUNT_FROM ? (
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
            ) : null}
          </FieldRow>
          <CategoryRow
            category={draft.category}
            source={draft.categorySource}
            onPick={(category) => edit({ category, categorySource: 'chosen' })}
          />
        </Section>
        <RewardSection
          field={reward}
          value={draft.rewardText}
          currency={draft.currency}
          category={draft.category}
          onCurrency={chooseCurrency}
          onAmount={(text) => {
            reward.set(text);
            edit({ rewardText: text });
          }}
          onBlur={onBlur}
        />
        <Section
          header={<Text>{t('bounty.post.form.detailsHeader')}</Text>}
          footer={<Text>{t('bounty.post.form.draftFooter')}</Text>}
        >
          <TimeRows time={draft.time} category={draft.category} label={copy.when} onEdit={edit} />
          <DescriptionRows
            description={draft.description}
            field={description}
            placeholder={copy.description}
            onBlur={onBlur}
            onEdit={edit}
          />
          {draft.place === null ? <AddPlaceRow label={copy.place} onPick={pickPlace} /> : null}
        </Section>
        {draft.place ? (
          <PlaceSections
            heading={copy.place}
            place={draft.place}
            label={place.label}
            address={place.address}
            focusLabel={place.focusLabel}
            onPick={pickPlace}
            onBlur={onBlur}
            onRemove={place.remove}
          />
        ) : null}
        <ClearSection userId={userId} empty={draftStore.isEmpty(draft)} onCleared={onCleared} />
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
