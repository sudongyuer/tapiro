import { Image } from 'expo-image';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { imagePlaygroundProbe, type PhotoStickerResult, photoSticker } from 'tapiro-kit';

import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

type Row = { name: string; border: 'dilate' | 'contour'; result: PhotoStickerResult };

const BORDERS = ['dilate', 'contour'] as const;

// Spike only: photos are copied into Documents/spike-photos with simctl before launch.
async function runAll(onRow: (row: Row) => void) {
  const dir = new Directory(Paths.document, 'spike-photos');
  const photos = dir.exists ? dir.list().filter((entry) => entry instanceof File) : [];
  const rows: Row[] = [];
  for (const photo of photos) {
    for (const border of BORDERS) {
      let result = await photoSticker({ uri: photo.uri, border });
      if (result.status === 'failed' && result.code === 'vision') {
        const cpu = await photoSticker({ uri: photo.uri, border, cpuOnly: true });
        result = {
          ...cpu,
          ...(cpu.status === 'failed'
            ? { message: `${result.message} | cpu: ${cpu.message}` }
            : {}),
        };
      }
      const row = { name: photo.name, border, result };
      rows.push(row);
      onRow(row);
    }
  }
  new File(Paths.document, 'spike-results.json').write(JSON.stringify(rows, null, 2));
  const box = photos.find((photo) => photo.name.startsWith('box'));
  const probes = [
    ['帮取快递，一个纸箱包裹', 'illustration', null],
    ['a cardboard parcel being picked up', 'illustration', null],
    ['a cardboard parcel being picked up', 'sketch', null],
    ['ambil bungkusan kotak kadbod', 'illustration', null],
    ['crayon drawing', 'illustration', box?.uri ?? null],
  ] as const;
  const playground = [];
  for (const [prompt, style, image] of probes) {
    playground.push({
      prompt,
      style,
      image,
      result: await imagePlaygroundProbe(prompt, style, image),
    });
  }
  new File(Paths.document, 'spike-playground.json').write(JSON.stringify(playground, null, 2));
}

export function PhotoStickerScene({ onReady }: { onReady: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    runAll((row) => setRows((current) => [...current, row])).finally(onReady);
  }, [onReady]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      {rows.map(({ name, border, result }) => (
        <View key={`${name}-${border}`} style={styles.row}>
          {result.status === 'ok' ? (
            <Image source={{ uri: result.uri }} style={styles.sticker} contentFit="contain" />
          ) : null}
          <AppText variant="secondary">
            {result.status === 'ok'
              ? `${name} ${border} ${Math.round(result.visionMs)}/${Math.round(result.totalMs)} ms ${result.width}x${result.height} ${Math.round(result.bytes / 1024)} KB`
              : `${name} ${border} ${result.code}: ${result.message}`}
          </AppText>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: vars['--space-4'], gap: vars['--space-4'] },
  row: { gap: vars['--space-2'], alignItems: 'center' },
  sticker: { width: 240, height: 240, backgroundColor: vars['--color-card-progress'] },
});
