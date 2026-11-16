import { Picker, Section, Text } from '@expo/ui/swift-ui';
import {
  labelsHidden,
  listRowBackground,
  listSectionMargins,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n, type Language } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

export const MOMENT_COLUMN = listSectionMargins({
  length: vars['--space-6'],
  edges: 'horizontal',
});

export function LanguagePickerSection({
  footer,
  onMoment = false,
}: {
  footer?: string;
  onMoment?: boolean;
}) {
  const { t, language, setLanguage, languages } = useI18n();
  const { color } = useTheme();
  return (
    <Section
      header={onMoment ? undefined : <Text>{t('account.settings.language')}</Text>}
      footer={footer ? <Text>{footer}</Text> : undefined}
      modifiers={onMoment ? [MOMENT_COLUMN] : []}
    >
      <Picker<Language>
        label={t('account.settings.language')}
        selection={language}
        onSelectionChange={(next) => setLanguage(next)}
        modifiers={[
          pickerStyle('inline'),
          labelsHidden(),
          ...(onMoment ? [listRowBackground(color('--color-filled-row'))] : []),
        ]}
        testID="language-picker"
      >
        {languages.map(({ code, nativeName }) => (
          <Text key={code} modifiers={[tag(code)]} testID={`language-${code}`}>
            {nativeName}
          </Text>
        ))}
      </Picker>
    </Section>
  );
}
