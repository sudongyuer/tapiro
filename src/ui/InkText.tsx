import type { ColorValue } from 'react-native';

import { AppText, type AppTextProps } from './AppText';
import { OutlinedText } from './OutlinedText';
import { useTheme } from './theme/useTheme';

export function InkText({
  outline,
  ink,
  ...rest
}: AppTextProps & { outline: number; ink: ColorValue }) {
  const { theme } = useTheme();
  if (theme === 'dark') return <AppText {...rest} style={[rest.style, { color: ink }]} />;
  return <OutlinedText {...rest} outline={outline} ink={ink} />;
}
