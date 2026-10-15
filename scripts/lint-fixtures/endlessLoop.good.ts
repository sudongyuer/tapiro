import { withRepeat, withTiming } from 'react-native-reanimated';

export const a = withRepeat(withTiming(1, { duration: 800 }), 4, true);
