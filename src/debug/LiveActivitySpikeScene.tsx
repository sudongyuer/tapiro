import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LiveActivity } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

export function LiveActivitySpikeScene({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const [lines, setLines] = useState<string[]>([]);
  const id = useRef<string | null>(null);
  const minutes = useRef(6);

  const log = useCallback((line: string) => {
    console.log(`[live-activity-spike] ${line}`);
    setLines((prev) => [line, ...prev].slice(0, 20));
  }, []);

  useEffect(() => onReady(), [onReady]);

  const state = () => ({
    sentence: t('debug.liveActivity.sample', { minutes: minutes.current }),
    progress: (6 - minutes.current) / 6,
    minutes: minutes.current,
    staleAfterSeconds: (minutes.current + 5) * 60,
  });

  const start = async () => {
    minutes.current = 6;
    const result = await LiveActivity.start('bounty', state());
    if (result.status === 'ok') id.current = result.id;
    log(`start ${JSON.stringify(result)}`);
  };

  const update = async () => {
    if (!id.current) return log('start first');
    minutes.current = Math.max(minutes.current - 2, 0);
    log(`update ${JSON.stringify(await LiveActivity.update(id.current, state()))}`);
  };

  const end = async () => {
    if (!id.current) return log('start first');
    log(`end ${JSON.stringify(await LiveActivity.end(id.current, state(), true))}`);
    id.current = null;
  };

  const list = async () => log(`list ${JSON.stringify(await LiveActivity.list())}`);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.buttons}>
        <PillButton label={t('debug.liveActivity.start')} onPress={start} />
        <PillButton label={t('debug.liveActivity.update')} onPress={update} variant="secondary" />
        <PillButton label={t('debug.liveActivity.end')} onPress={end} variant="secondary" />
        <PillButton label={t('debug.liveActivity.list')} onPress={list} variant="secondary" />
      </View>
      {lines.map((line, index) => (
        <AppText key={`${index}-${line}`} variant="meta" selectable>
          {line}
        </AppText>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: vars['--space-4'], gap: vars['--space-2'] },
  buttons: { gap: vars['--space-2'] },
});
