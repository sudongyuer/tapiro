import { Button, Host, Menu } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  labelStyle,
  menuIndicator,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

export type ImageFrom = 'photo' | 'camera';

export function AttachMenu({ onPick }: { onPick: (from: ImageFrom) => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Host matchContents>
      <Menu
        label={t('chat.thread.attach')}
        systemImage="plus"
        modifiers={[
          labelStyle('iconOnly'),
          buttonStyle('glass'),
          buttonBorderShape('circle'),
          controlSize('large'),
          menuIndicator('hidden'),
          tint(color('--color-accent')),
          accessibilityLabel(t('chat.thread.attach')),
          accessibilityIdentifier('chat-composer-attach'),
        ]}
      >
        <Button
          label={t('chat.thread.photo')}
          systemImage="photo.on.rectangle"
          onPress={() => onPick('photo')}
        />
        <Button
          label={t('chat.thread.camera')}
          systemImage="camera"
          onPress={() => onPick('camera')}
        />
      </Menu>
    </Host>
  );
}
