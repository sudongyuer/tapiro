import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { typeStyle, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { linkSegments } from './linkSegments';

const LINK_SLOP = (vars['--touch-min'] - typeStyle('meta').lineHeight) / 2;

export function TermsLine() {
  const { t } = useI18n();
  const { color } = useTheme();
  const router = useRouter();
  return (
    <View style={styles.line}>
      {linkSegments(t('account.welcome.terms')).map(({ text, link }, index) =>
        link ? (
          <Pressable
            key={index}
            accessibilityRole="link"
            hitSlop={{ top: LINK_SLOP, bottom: LINK_SLOP }}
            testID={`welcome-${link}-link`}
            onPress={() => router.push(`/legal/${link}`)}
          >
            <AppText variant="meta" style={[styles.link, { color: color('--color-accent') }]}>
              {text}
            </AppText>
          </Pressable>
        ) : (
          <AppText key={index} variant="meta" tone="secondaryLabel">
            {text}
          </AppText>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  link: { fontWeight: '600', textDecorationLine: 'underline' },
});
