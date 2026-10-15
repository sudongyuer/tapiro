import { useState } from 'react';
import { useWindowDimensions } from 'react-native';

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
  const layout = welcomeLayout(window);
  const [picked, setPicked] = useState<ObjectKind | null>(null);
  const line = picked ? t(stickerExampleKey(picked)) : t('account.welcome.hello');
  return (
    <MomentBackground testID="welcome-screen" onLayout={onLayout}>
      {layout.stickers.map((sticker) => (
        <WelcomeSticker
          key={sticker.kind}
          sticker={sticker}
          label={t(stickerExampleKey(sticker.kind))}
          onPress={() => setPicked(sticker.kind)}
        />
      ))}
      <WelcomeHero layout={layout} line={line} />
      <SignInPanel />
    </MomentBackground>
  );
}
