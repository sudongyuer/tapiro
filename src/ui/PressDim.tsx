import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { EASE_ENTER } from './theme/motion';
import { vars } from './theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const RELEASE = {
  duration: vars['--duration-press'],
  easing: EASE_ENTER,
  reduceMotion: ReduceMotion.Never,
} as const;

export type PressDimProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> };

export function PressDim({ style, onPressIn, onPressOut, ...rest }: PressDimProps) {
  const opacity = useSharedValue(1);
  const dim = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, dim]}
      onPressIn={(event) => {
        opacity.set(vars['--opacity-pressed']);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        opacity.set(withTiming(1, RELEASE));
        onPressOut?.(event);
      }}
    />
  );
}
