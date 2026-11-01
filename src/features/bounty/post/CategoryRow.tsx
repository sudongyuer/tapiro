import { HStack, Label, Picker, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  font,
  foregroundStyle,
  labelsHidden,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { BOUNTY_CATEGORIES, bountyCategory, type BountyCategory } from '@/lib/stickers/category';
import { CATEGORY_SYMBOLS } from '@/ui/categoryArt';
import { vars } from '@/ui/theme/tokens';

import { fullRow, ROW_INSETS } from './FieldRow';
import type { CategorySource } from './types';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function CategoryRow({
  category,
  source,
  onPick,
}: {
  category: BountyCategory | null;
  source: CategorySource;
  onPick: (category: BountyCategory) => void;
}) {
  const { t } = useI18n();
  return (
    <HStack spacing={vars['--space-2']} modifiers={[fullRow, ROW_INSETS]}>
      <Text>{t('bounty.post.form.category')}</Text>
      {source === 'auto' ? (
        <Text
          modifiers={[
            font({ textStyle: 'caption' }),
            secondary,
            accessibilityIdentifier('bounty-post-category-auto'),
          ]}
        >
          {t('bounty.post.form.autoCategory')}
        </Text>
      ) : null}
      <Spacer />
      <Picker
        label={t('bounty.post.form.category')}
        selection={category ?? ''}
        onSelectionChange={(next: string) => {
          const picked = bountyCategory(next);
          if (picked) onPick(picked);
        }}
        testID="bounty-post-category"
        modifiers={[pickerStyle('menu'), labelsHidden()]}
      >
        {category === null ? (
          <Text modifiers={[tag('')]}>{t('bounty.post.form.categoryPlaceholder')}</Text>
        ) : null}
        {BOUNTY_CATEGORIES.map((option) => (
          <Label
            key={option}
            title={t(`bounty.category.${option}`)}
            systemImage={CATEGORY_SYMBOLS[option]}
            modifiers={[tag(option)]}
          />
        ))}
      </Picker>
    </HStack>
  );
}
