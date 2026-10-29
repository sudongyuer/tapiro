import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { PlatformColor, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { TabAccessoryKind } from '@/lib/liveItems';
import { CURRENCIES, formatMoney } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import type { TokenName } from '@/ui/theme/tokens';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { MostUrgent } from './accessory';

const GLYPHS: Record<
  TabAccessoryKind,
  { fill: TokenName; ink: TokenName; symbol: SFSymbol | null }
> = {
  oweMoney: { fill: '--color-card-pay', ink: '--color-on-card-pay', symbol: null },
  rideSoon: { fill: '--color-card-ride', ink: '--color-on-card-ride', symbol: 'car.fill' },
  owedToYou: {
    fill: '--color-card-progress',
    ink: '--color-on-card-progress',
    symbol: 'arrow.down.left',
  },
  bountyAction: {
    fill: '--color-card-progress',
    ink: '--color-on-card-progress',
    symbol: 'exclamationmark',
  },
  bountyInProgress: {
    fill: '--color-sticker-handle',
    ink: '--color-on-sticker',
    symbol: 'hourglass',
  },
  waitingConfirm: {
    fill: '--color-card-calm',
    ink: '--color-on-card-calm',
    symbol: 'clock',
  },
};

const GLYPH_SIZE = { regular: 36, inline: 28 } as const;

export function UrgentAccessory({ urgent, onPress }: { urgent: MostUrgent; onPress: () => void }) {
  const { t, language } = useI18n();
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const { item, more } = urgent;
  const spokenSub =
    more > 0 ? t('shell.accessory.withMore', { sub: item.sub, count: more }) : item.sub;
  const inline = placement === 'inline';
  const amount = item.amount === undefined ? null : formatMoney(item.amount, language);
  const spokenTitle = amount ? `${item.title} ${amount}` : item.title;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('shell.accessory.label', { title: spokenTitle, sub: spokenSub })}
      accessibilityHint={t('shell.accessory.hint')}
      testID={inline ? 'urgent-accessory-inline' : 'urgent-accessory'}
      onPress={onPress}
      style={({ pressed }) => [styles.row, inline && styles.inline, pressed && styles.pressed]}
    >
      <Glyph
        kind={item.kind}
        unit={item.amount ? CURRENCIES[item.amount.currency].symbol : null}
        size={GLYPH_SIZE[placement]}
      />
      <View style={styles.text}>
        <AppText variant="secondary" style={styles.title} numberOfLines={1}>
          {item.title}
        </AppText>
        {inline ? null : (
          <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
            {item.sub}
          </AppText>
        )}
      </View>
      {amount ? (
        <AppText variant="secondary" style={styles.amount} numberOfLines={1}>
          {amount}
        </AppText>
      ) : null}
      {inline || more === 0 ? null : <MorePill count={more} />}
      {inline ? null : (
        <SymbolView name="chevron.right" size={13} tintColor={PlatformColor('tertiaryLabel')} />
      )}
    </Pressable>
  );
}

function MorePill({ count }: { count: number }) {
  return (
    <View style={styles.more}>
      <AppText variant="meta" tone="secondaryLabel" style={styles.moreText}>
        {`+${count}`}
      </AppText>
    </View>
  );
}

function Glyph({
  kind,
  unit,
  size,
}: {
  kind: TabAccessoryKind;
  unit: string | null;
  size: number;
}) {
  const { color } = useTheme();
  const { fill, ink, symbol } = GLYPHS[kind];
  return (
    <View
      style={[
        styles.glyph,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color(fill) },
      ]}
    >
      {symbol ? (
        <SymbolView name={symbol} size={size * 0.45} tintColor={color(ink)} />
      ) : (
        <AppText variant="meta" style={[styles.money, { color: color(ink) }]}>
          {unit}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    paddingLeft: vars['--space-2'],
    paddingRight: vars['--space-4'],
    minHeight: vars['--touch-min'],
  },
  inline: { paddingRight: vars['--space-3'], gap: vars['--space-2'] },
  pressed: { opacity: 0.6 },
  text: { flex: 1, minWidth: 0 },
  title: { fontWeight: '600' },
  amount: { fontWeight: '700', flexShrink: 0, fontVariant: ['tabular-nums'] },
  more: {
    minWidth: vars['--space-6'],
    height: vars['--space-5'],
    paddingHorizontal: vars['--space-2'],
    borderRadius: vars['--radius-pill'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PlatformColor('quaternarySystemFill'),
  },
  moreText: { fontWeight: '700' },
  glyph: { alignItems: 'center', justifyContent: 'center' },
  money: { fontWeight: '800' },
});
