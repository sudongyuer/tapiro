import { useColorScheme } from 'react-native';

import { token, type ThemeName, type TokenName } from './tokens';

export function useTheme() {
  const theme: ThemeName = useColorScheme() === 'dark' ? 'dark' : 'light';
  return {
    theme,
    color: (name: TokenName) => token(name, theme) as string,
  };
}
