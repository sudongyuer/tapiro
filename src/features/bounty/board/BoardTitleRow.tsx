import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

import type { BoardView } from './viewStore';
import { ViewSwitch } from './ViewSwitch';

export function BoardTitleRow({
  view,
  hint,
  reduceMotion,
  onChoose,
  onTitle,
}: {
  view: BoardView;
  hint: boolean;
  reduceMotion: boolean;
  onChoose: (view: BoardView) => void;
  onTitle: (node: View | null) => void;
}) {
  const { t } = useI18n();
  return (
    <View ref={onTitle} style={styles.block}>
      <View style={styles.row}>
        <AppText
          variant="title"
          accessibilityRole="header"
          testID="bounty-board-title"
          style={styles.title}
        >
          {t('bounty.board.title')}
        </AppText>
        <ViewSwitch view={view} reduceMotion={reduceMotion} onChoose={onChoose} />
      </View>
      {hint ? <RememberedHint /> : null}
    </View>
  );
}

function RememberedHint() {
  const { t } = useI18n();
  const text = t('bounty.board.remembered');
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
  return (
    <AppText
      variant="meta"
      tone="secondaryLabel"
      testID="bounty-board-remembered"
      style={styles.hint}
    >
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  block: { gap: vars['--space-1'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  title: { flex: 1, fontWeight: '700', paddingHorizontal: 2 },
  hint: { paddingHorizontal: 2 },
});
