import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';

import { BOOK_VIEWS, type BookView } from './bookViewStore';

export function BookSwitch({
  view,
  onChoose,
}: {
  view: BookView;
  onChoose: (view: BookView) => void;
}) {
  const { t } = useI18n();
  return (
    <Host matchContents={{ vertical: true }}>
      <Picker
        selection={view}
        onSelectionChange={(next: string) => {
          const chosen = BOOK_VIEWS.find((candidate) => candidate === next);
          if (chosen) onChoose(chosen);
        }}
        testID="sticker-book-view"
        modifiers={[pickerStyle('segmented'), accessibilityLabel(t('stickers.book.view.a11y'))]}
      >
        {BOOK_VIEWS.map((option) => (
          <Text key={option} modifiers={[tag(option)]}>
            {t(`stickers.book.view.${option}`)}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
