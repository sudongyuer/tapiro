import { memo } from 'react';
import { PlatformColor, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/ui/AppText';
import { HandArt, HandArtSticker } from '@/ui/HandArt';
import { vars } from '@/ui/theme/tokens';
import { useSelectedUntilReturn } from '@/ui/useSelectedUntilReturn';

import type { RowView } from './rowView';

const ART_BOX = vars['--touch-min'];
const ART = 40;
const DOT = 10;
const SEPARATOR_INSET = vars['--space-4'] + ART_BOX + vars['--space-3'];

export const ThreadRow = memo(function ThreadRow({
  id,
  view,
  first,
  last,
  onOpen,
}: {
  id: string;
  view: RowView;
  first: boolean;
  last: boolean;
  onOpen: (id: string) => void;
}) {
  const { select, highlight } = useSelectedUntilReturn();
  return (
    <Pressable
      onPress={() => {
        select();
        onOpen(id);
      }}
      accessibilityRole="button"
      accessibilityLabel={view.a11y}
      testID={`chat-row-${id}`}
      style={[styles.row, first && styles.first, last && styles.last]}
    >
      {({ pressed }) => (
        <>
          <Animated.View pointerEvents="none" style={[styles.fill, styles.selected, highlight]} />
          {pressed ? <View pointerEvents="none" style={[styles.fill, styles.selected]} /> : null}
          {first ? null : <View style={styles.separator} />}
          <View style={styles.art}>
            {view.art.kind === 'bounty' ? (
              <HandArtSticker source={view.art.source} size={ART} />
            ) : (
              <HandArt id={view.art.id} size={ART} />
            )}
          </View>
          <View style={styles.text}>
            <View style={styles.line}>
              <AppText variant="body" style={styles.title} numberOfLines={1}>
                {view.title}
              </AppText>
              <AppText variant="body" tone="secondaryLabel" style={styles.side} numberOfLines={1}>
                {` · ${view.side}`}
              </AppText>
              <AppText variant="meta" tone="secondaryLabel" style={styles.time}>
                {view.time}
              </AppText>
            </View>
            <View style={styles.line}>
              <AppText
                variant="secondary"
                tone={view.unread ? 'label' : 'secondaryLabel'}
                style={styles.preview}
                numberOfLines={1}
              >
                {view.last}
              </AppText>
              {view.unread ? <View style={styles.dot} testID={`chat-row-${id}-unread`} /> : null}
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    minHeight: vars['--touch-min'],
    paddingVertical: vars['--space-3'],
    paddingHorizontal: vars['--space-4'],
    overflow: 'hidden',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  first: {
    borderTopLeftRadius: vars['--radius-card'],
    borderTopRightRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  last: {
    borderBottomLeftRadius: vars['--radius-card'],
    borderBottomRightRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  selected: { backgroundColor: PlatformColor('systemFill') },
  separator: {
    position: 'absolute',
    top: 0,
    left: SEPARATOR_INSET,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: PlatformColor('separator'),
  },
  art: { width: ART_BOX, height: ART_BOX, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: vars['--space-1'] },
  line: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  title: { flexShrink: 1, fontWeight: '600' },
  side: { flexShrink: 0, maxWidth: '45%', marginLeft: -vars['--space-2'] },
  time: { marginLeft: 'auto', flexShrink: 0 },
  preview: { flex: 1 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: PlatformColor('systemRed'),
  },
});
