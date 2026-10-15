import { withRepeat, withTiming } from 'react-native-reanimated';

export const a = withRepeat(withTiming(1, { duration: 800 }), -1, true);
export const b = withRepeat(withTiming(1, { duration: 800 }), Infinity, true);
export const c = { animationIterationCount: 'infinite' };
