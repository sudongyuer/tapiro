import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import type { AccessoryItem } from '@/lib/liveItems';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { LiveCard, useLiveCardPaint, type LiveCardTone } from '@/ui/LiveCard';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { CardText, Pill } from './cardParts';

const ASK_HEIGHT = 54;
const MIC = 42;

function greetingKey(hour: number) {
  if (hour < 12) return 'home.card.calm.morning' as const;
  return hour < 18 ? ('home.card.calm.afternoon' as const) : ('home.card.calm.evening' as const);
}

export function CalmCard({ name, onAsk }: { name: string; onAsk: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { ink, surface } = useLiveCardPaint('calm');
  const chips = [
    t('home.card.calm.chipRide'),
    t('home.card.calm.chipParcel'),
    t('home.card.calm.chipStudy'),
  ];
  return (
    <LiveCard tone="calm">
      <View accessible testID="live-card-calm">
        <CardText variant="meta" ink={ink} muted style={styles.tag}>
          {t('home.card.calm.tag')}
        </CardText>
        <CardText variant="title" ink={ink} style={styles.greeting}>
          {t(greetingKey(new Date().getHours()), { name })}
        </CardText>
      </View>
      <PressDim
        accessibilityRole="button"
        accessibilityLabel={t('home.card.calm.ask')}
        accessibilityHint={t('home.card.calm.askHint')}
        testID="home-ask"
        onPress={onAsk}
        style={[
          styles.ask,
          {
            backgroundColor: color('--color-stage-bubble'),
            shadowColor: color('--color-sticker-shadow'),
          },
        ]}
      >
        <CardText variant="secondary" ink={ink} muted numberOfLines={2} style={styles.askText}>
          {t('home.card.calm.ask')}
        </CardText>
        <View style={[styles.mic, { backgroundColor: ink }]}>
          <SymbolView name="mic.fill" size={18} tintColor={surface} />
        </View>
      </PressDim>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <View key={chip} style={[styles.chip, { backgroundColor: surface }]}>
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.chipFill,
                { backgroundColor: color('--color-stage-bubble') },
              ]}
            />
            <AppText variant="meta" numberOfLines={1} style={{ color: ink }}>
              {chip}
            </AppText>
          </View>
        ))}
      </View>
    </LiveCard>
  );
}

const FALLBACK_TONE: Record<AccessoryItem['kind'], LiveCardTone> = {
  oweMoney: 'pay',
  rideSoon: 'ride',
  owedToYou: 'progress',
  bountyAction: 'progress',
  bountyInProgress: 'progress',
  waitingConfirm: 'calm',
};

const FALLBACK_TAG = {
  oweMoney: 'home.card.pay.tag',
  rideSoon: 'home.stage.live',
  owedToYou: 'home.card.owed.tag',
  bountyAction: 'home.card.bounty.tag.action',
  bountyInProgress: 'home.stage.live',
  waitingConfirm: 'home.card.waiting.tag',
} as const;

export function FallbackCard({ item }: { item: AccessoryItem }) {
  const { t } = useI18n();
  const tone = FALLBACK_TONE[item.kind];
  const { ink } = useLiveCardPaint(tone);
  return (
    <LiveCard tone={tone}>
      <Pill ink={ink}>{t(FALLBACK_TAG[item.kind])}</Pill>
      <CardText variant="title" ink={ink} style={styles.greeting}>
        {item.title}
      </CardText>
      <CardText variant="secondary" ink={ink} muted>
        {item.sub}
      </CardText>
    </LiveCard>
  );
}

const styles = StyleSheet.create({
  tag: { textAlign: 'right' },
  greeting: { fontWeight: '700', marginTop: vars['--space-2'] },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    minHeight: ASK_HEIGHT,
    marginTop: vars['--space-4'],
    paddingLeft: vars['--space-5'],
    paddingRight: 6,
    borderRadius: ASK_HEIGHT / 2,
    shadowOffset: { width: 0, height: vars['--space-1'] },
    shadowOpacity: 1,
    shadowRadius: vars['--space-3'],
  },
  askText: { flex: 1 },
  mic: {
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: vars['--space-3'] },
  chip: {
    minHeight: 30,
    paddingHorizontal: vars['--space-3'],
    borderRadius: vars['--radius-pill'],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipFill: { opacity: 0.75 },
});
