import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { OutlinedText } from '@/ui/OutlinedText';
import { StickerShadow } from '@/ui/StickerArt';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { MASCOT_SIZE, type WelcomeLayout } from './welcomeLayout';
import { useBreath, usePop } from './welcomeMotion';

const MASCOT_DELAY = 420;
const WORDMARK_DELAY = 560;
const TAGLINE_DELAY = 640;
const BUBBLE_DELAY = 700;

export function WelcomeHero({ layout, line }: { layout: WelcomeLayout; line: string }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const mascotPop = usePop(MASCOT_DELAY);
  const breath = useBreath(MASCOT_DELAY);
  const wordmarkPop = usePop(WORDMARK_DELAY);
  const taglinePop = usePop(TAGLINE_DELAY);
  const bubblePop = usePop(BUBBLE_DELAY);
  const ink = color('--color-on-sticker');
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.mascot, { top: layout.mascotTop }, mascotPop]}
      >
        <Animated.View style={breath}>
          <StickerShadow>
            <Mascot variant="side" size={MASCOT_SIZE} outlined />
          </StickerShadow>
        </Animated.View>
      </Animated.View>
      <View
        pointerEvents="none"
        style={[styles.bubbleRow, { left: layout.bubble.x, top: layout.bubble.y }]}
      >
        <Animated.View style={bubblePop}>
          <View
            accessible
            accessibilityLabel={line}
            testID="welcome-bubble"
            style={[
              styles.bubble,
              {
                backgroundColor: color('--color-stage-bubble'),
                shadowColor: color('--color-sticker-shadow'),
              },
            ]}
          >
            <AppText
              variant="secondary"
              numberOfLines={2}
              style={[styles.say, { color: color('--color-on-stage') }]}
            >
              {line}
            </AppText>
          </View>
        </Animated.View>
      </View>
      <View pointerEvents="none" style={[styles.words, { top: layout.wordmarkTop }]}>
        <Animated.View style={wordmarkPop}>
          <OutlinedText
            variant="wordmark"
            outline={vars['--sticker-border']}
            ink={ink}
            accessibilityRole="header"
            testID="welcome-wordmark"
            style={styles.center}
          >
            {t('account.welcome.wordmark')}
          </OutlinedText>
        </Animated.View>
        <Animated.View style={taglinePop}>
          <OutlinedText
            variant="body"
            outline={vars['--sticker-border-small']}
            ink={ink}
            style={[styles.center, styles.tagline]}
          >
            {t('account.welcome.tagline')}
          </OutlinedText>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  mascot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bubbleRow: { position: 'absolute', right: vars['--space-4'], alignItems: 'flex-start' },
  bubble: {
    borderRadius: vars['--radius-chip'],
    borderCurve: 'continuous',
    paddingVertical: vars['--space-1'],
    paddingHorizontal: vars['--space-3'],
    shadowOffset: { width: 0, height: vars['--space-1'] },
    shadowOpacity: 1,
    shadowRadius: vars['--space-2'],
    transform: [{ rotate: '6deg' }],
  },
  say: { fontWeight: '700' },
  words: {
    position: 'absolute',
    left: vars['--space-5'],
    right: vars['--space-5'],
    alignItems: 'center',
    gap: vars['--space-1'],
  },
  center: { textAlign: 'center' },
  tagline: { fontWeight: '800' },
});
