import type { ReactNode, Ref } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';

import type { HandArtId } from '@/lib/handArt';
import { useI18n } from '@/lib/i18n';
import { dateFormat } from '@/lib/intlCache';
import { AppText } from '@/ui/AppText';
import { HandArt } from '@/ui/HandArt';
import { HandText } from '@/ui/HandText';
import { Mascot } from '@/ui/Mascot';
import { token, vars, type TokenName } from '@/ui/theme/tokens';

import { monthWeeks, weekdayNames } from './calendar';
import { cardDate } from './DoneCard';
import { collage, type PosterBackground, type PosterCard, type PosterMonth } from './posterData';

export const POSTER_RATIO = 16 / 9;
const MASCOT = 28;

const FILL: Record<PosterBackground, TokenName> = {
  paper: '--color-paper',
  tint: '--color-poster-tint',
  night: '--color-poster-night',
};

const ink = (name: TokenName) => token(name) as string;

type FrameProps = {
  background: PosterBackground;
  arts: HandArtId[];
  width: number;
  label: string;
  posterRef: Ref<ViewInstance>;
  children: ReactNode;
};

function PosterFrame({ background, arts, width, label, posterRef, children }: FrameProps) {
  const { t } = useI18n();
  const height = width * POSTER_RATIO;
  return (
    <View
      ref={posterRef}
      collapsable={false}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID="sticker-poster"
      style={[styles.poster, { width, height, backgroundColor: ink(FILL[background]) }]}
    >
      {collage(arts).map((piece, at) => (
        <View
          key={at}
          style={[
            styles.piece,
            {
              left: piece.x * width,
              top: piece.y * height,
              transform: [{ rotate: `${piece.rotate}deg` }],
            },
          ]}
        >
          <HandArt id={piece.art} size={piece.size * width} />
        </View>
      ))}
      <View style={styles.middle}>{children}</View>
      <View style={[styles.brand, { backgroundColor: ink('--color-receipt') }]}>
        <Mascot variant="front" size={MASCOT} />
        <AppText
          variant="reward"
          allowFontScaling={false}
          style={[styles.wordmark, { color: ink('--color-on-paper') }]}
        >
          {t('account.welcome.wordmark')}
        </AppText>
      </View>
    </View>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: ink('--color-receipt'), shadowColor: ink('--color-sticker-shadow') },
      ]}
    >
      {children}
    </View>
  );
}

type PosterProps<T> = {
  data: T;
  arts: HandArtId[];
  background: PosterBackground;
  width: number;
  posterRef: Ref<ViewInstance>;
};

export function CardPoster({ data, arts, background, width, posterRef }: PosterProps<PosterCard>) {
  const { t, language } = useI18n();
  const date = cardDate(language, data.earnedAt);
  return (
    <PosterFrame
      background={background}
      arts={arts}
      width={width}
      posterRef={posterRef}
      label={t('stickers.poster.a11yCard', { date, title: data.title })}
    >
      <Panel>
        <HandArt id={data.art} size={width * 0.46} />
        <HandText
          hand="date"
          allowFontScaling={false}
          numberOfLines={1}
          style={{ color: ink('--color-on-paper-muted') }}
        >
          {date}
        </HandText>
        <AppText
          variant="body"
          allowFontScaling={false}
          numberOfLines={2}
          style={[styles.center, styles.title, { color: ink('--color-on-paper') }]}
          testID="sticker-poster-title"
        >
          {data.title}
        </AppText>
      </Panel>
    </PosterFrame>
  );
}

export function MonthPoster({
  data,
  arts,
  background,
  width,
  posterRef,
}: PosterProps<PosterMonth>) {
  const { t, language } = useI18n();
  const first = new Date(data.month.year, data.month.month, 1);
  const heading = dateFormat(language, { year: 'numeric', month: 'long' }).format(first);
  const name = dateFormat(language, { month: 'long' }).format(first);
  const cell = (width * 0.84 - vars['--space-3'] * 2) / 7;
  const muted = { color: ink('--color-on-paper-muted') };
  return (
    <PosterFrame
      background={background}
      arts={arts}
      width={width}
      posterRef={posterRef}
      label={t('stickers.poster.a11yMonth', { month: name, count: data.total })}
    >
      <Panel>
        <HandText
          hand="month"
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.heading, { color: ink('--color-on-paper') }]}
        >
          {heading}
        </HandText>
        <View style={styles.row}>
          {weekdayNames(dateFormat(language, { weekday: 'narrow' })).map((day, column) => (
            <AppText
              key={column}
              variant="meta"
              allowFontScaling={false}
              style={[styles.weekday, muted, { width: cell }]}
            >
              {day}
            </AppText>
          ))}
        </View>
        {monthWeeks(data.month).map((week, row) => (
          <View key={row} style={styles.row}>
            {week.map((day, column) => {
              const done = day === null ? undefined : data.days.get(day);
              return (
                <View key={column} style={[styles.cell, { width: cell, height: cell }]}>
                  {done ? <HandArt id={done.art} size={cell - vars['--space-1']} /> : null}
                </View>
              );
            })}
          </View>
        ))}
        <AppText
          variant="secondary"
          allowFontScaling={false}
          numberOfLines={2}
          style={[styles.center, muted]}
          testID="sticker-poster-line"
        >
          {t('stickers.poster.monthLine', { count: data.total })}
        </AppText>
      </Panel>
    </PosterFrame>
  );
}

const styles = StyleSheet.create({
  poster: {
    overflow: 'hidden',
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: { position: 'absolute' },
  middle: { width: '84%', alignItems: 'stretch' },
  panel: {
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    alignItems: 'center',
    paddingHorizontal: vars['--space-3'],
    paddingVertical: vars['--space-5'],
    gap: vars['--space-2'],
    shadowOffset: { width: 0, height: vars['--sticker-shadow-y'] },
    shadowOpacity: 1,
    shadowRadius: vars['--sticker-shadow-blur'] * 2,
  },
  center: { textAlign: 'center' },
  title: { fontWeight: '600' },
  heading: { paddingHorizontal: vars['--space-2'] },
  row: { flexDirection: 'row' },
  weekday: { textAlign: 'center' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  brand: {
    position: 'absolute',
    bottom: vars['--space-5'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-2'],
    borderRadius: vars['--radius-pill'],
    paddingVertical: vars['--space-1'],
    paddingLeft: vars['--space-2'],
    paddingRight: vars['--space-4'],
  },
  wordmark: { fontWeight: '800' },
});
