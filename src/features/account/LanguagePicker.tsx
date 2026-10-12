import { Picker, Section, Text } from '@expo/ui/swift-ui';
import { labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { useI18n, type Language } from '@/lib/i18n';

export function LanguagePickerSection({ footer }: { footer?: string }) {
  const { t, language, setLanguage, languages } = useI18n();
  return (
    <Section
      header={<Text>{t('account.settings.language')}</Text>}
      footer={footer ? <Text>{footer}</Text> : undefined}
    >
      <Picker<Language>
        label={t('account.settings.language')}
        selection={language}
        onSelectionChange={(next) => setLanguage(next)}
        modifiers={[pickerStyle('inline'), labelsHidden()]}
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
