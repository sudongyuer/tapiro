import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { BountyCategory } from '@/lib/stickers/category';
import { AppText } from '@/ui/AppText';
import { CategorySticker } from '@/ui/CategorySticker';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const STAMP_TILT = -12;
const STAMP_RADIUS = 6;
const STAMP_TRACKING = 1;
const STAMP_MIN_SCALE = 0.6;

export function AppliedSticker({
  category,
  size,
  applied,
  testID,
}: {
  category: BountyCategory;
  size: number;
  applied: boolean;
  testID: string;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <View style={applied ? styles.tilted : null}>
        <CategorySticker category={category} size={size} />
      </View>
      {applied ? (
        <View style={styles.stampLane}>
          <View
            testID={`${testID}-stamp`}
            style={[
              styles.stamp,
              {
                borderColor: color('--color-success'),
                backgroundColor: color('--color-receipt'),
              },
            ]}
          >
            <AppText
              variant="meta"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={STAMP_MIN_SCALE}
              style={[styles.stampText, { color: color('--color-success') }]}
            >
              {t('bounty.stamp')}
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tilted: { transform: [{ rotate: `${vars['--sticker-rotation-max']}deg` }] },
  stampLane: {
    position: 'absolute',
    left: 0,
    right: -vars['--space-2'],
    bottom: -vars['--space-1'],
    alignItems: 'center',
  },
  stamp: {
    borderWidth: vars['--sticker-border-small'],
    borderRadius: STAMP_RADIUS,
    borderCurve: 'continuous',
    paddingHorizontal: vars['--space-1'],
    transform: [{ rotate: `${STAMP_TILT}deg` }],
  },
  stampText: { fontWeight: '800', letterSpacing: STAMP_TRACKING },
});
