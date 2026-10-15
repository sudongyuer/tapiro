import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { vars } from './theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESSED_OPACITY = 0.6;

export type PressDimProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> };

export function PressDim({ style, onPressIn, onPressOut, ...rest }: PressDimProps) {
  const opacity = useSharedValue(1);
  const dim = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const fade = (to: number) => {
    opacity.set(withTiming(to, { duration: vars['--duration-press'] }));
  };
  return (
    <AnimatedPressable
      {...rest}
      style={[style, dim]}
      onPressIn={(event) => {
        fade(PRESSED_OPACITY);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        fade(1);
        onPressOut?.(event);
      }}
    />
  );
}
