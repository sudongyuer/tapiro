import { useState } from 'react';
import { AccessibilityInfo, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { MomentBackground } from '@/ui/MomentBackground';
import type { ObjectKind } from '@/ui/objectKinds';

import { SignInPanel } from './SignInPanel';
import { WelcomeHero } from './WelcomeHero';
import { stickerExampleKey, welcomeLayout } from './welcomeLayout';
import { WelcomeSticker } from './WelcomeSticker';

export function WelcomeScreen({ onLayout }: { onLayout?: () => void }) {
  const { t } = useI18n();
  const window = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [picked, setPicked] = useState<ObjectKind | null>(null);
  const layout =
    panelHeight === null
      ? null
      : welcomeLayout({ width: window.width, height: window.height, panelHeight, topInset: top });
  const line = picked ? t(stickerExampleKey(picked)) : t('account.welcome.hello');
  return (
    <MomentBackground testID="welcome-screen" onLayout={onLayout}>
      {layout?.stickers.map((sticker) => (
        <WelcomeSticker
          key={sticker.kind}
          sticker={sticker}
          label={t(stickerExampleKey(sticker.kind))}
          onPress={() => {
            setPicked(sticker.kind);
            AccessibilityInfo.announceForAccessibility(t(stickerExampleKey(sticker.kind)));
          }}
        />
      ))}
      {layout ? <WelcomeHero layout={layout} line={line} /> : null}
      <SignInPanel onMeasure={setPanelHeight} />
    </MomentBackground>
  );
}
