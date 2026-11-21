import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Alert, PlatformColor, StyleSheet, View } from 'react-native';
import { ContextMenuView, type ContextMenuAction } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';

import { previewImage } from '../images/imageFiles';
import { bubbleImageSize } from '../images/imageSize';
import { useBubbleImage } from '../images/useBubbleImage';
import { chatImages } from '../services';
import { copyImage } from './messageActions';
import type { BubbleImage } from './threadView';

const RADIUS = vars['--radius-card'];

async function openViewer(uri: string, title: string, failed: string) {
  const shown = await previewImage(uri, title).catch(() => false);
  if (!shown) Alert.alert(failed);
}

export function ImageBubble({
  image,
  label,
  testID,
  report,
}: {
  image: BubbleImage;
  label: string;
  testID: string;
  report: (() => void) | null;
}) {
  const { t } = useI18n();
  const load = useBubbleImage(image);
  const size = bubbleImageSize(image.width, image.height);
  const uri = load.status === 'ready' ? load.uri : null;
  const failed = load.status === 'failed';
  const retryable = failed && image.kind === 'stored';
  const actions: ContextMenuAction[] = [
    ...(uri ? [{ id: 'copy', title: t('chat.thread.copy'), systemImage: 'doc.on.doc' }] : []),
    ...(report
      ? [
          {
            id: 'report',
            title: t('chat.thread.report'),
            systemImage: 'exclamationmark.bubble',
            separate: true,
          },
        ]
      : []),
  ];
  const act = (id: string) => {
    if (id === 'open' && uri)
      void openViewer(uri, t('chat.thread.image'), t('chat.thread.viewFailed'));
    if (id === 'copy' && uri) copyImage(uri);
    if (id === 'report') report?.();
  };
  const press = () => {
    if (uri) return act('open');
    if (retryable) chatImages.retry(image.path);
  };
  const state = failed
    ? t(retryable ? 'chat.thread.imageFailed' : 'chat.thread.imageGone')
    : load.shown
      ? null
      : t('chat.thread.imageLoading');

  return (
    <ContextMenuView actions={actions} cornerRadius={RADIUS} onAction={act} style={styles.menu}>
      <PressDim
        accessibilityRole="imagebutton"
        accessibilityLabel={state ? t('chat.thread.a11yImageState', { label, state }) : label}
        accessibilityHint={
          uri ? t('chat.thread.openImage') : retryable ? t('chat.thread.imageRetryHint') : undefined
        }
        accessibilityActions={actions.map((action) => ({ name: action.id, label: action.title }))}
        onAccessibilityAction={(event) => act(event.nativeEvent.actionName)}
        onPress={press}
        testID={testID}
        style={[styles.frame, { width: size.width, height: size.height }]}
      >
        {load.shown && !failed ? (
          <Image
            source={{ uri: load.shown }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={{ duration: vars['--duration-fade'], skipOnCacheHit: 'all' }}
            testID={`${testID}-image`}
          />
        ) : failed ? (
          <View style={styles.failed} testID={`${testID}-failed`}>
            {retryable ? (
              <SymbolView
                name="arrow.clockwise"
                size={vars['--touch-min'] / 2}
                tintColor={PlatformColor('secondaryLabel')}
              />
            ) : null}
            <AppText variant="meta" tone="secondaryLabel" style={styles.failedText}>
              {t(retryable ? 'chat.thread.imageFailedShort' : 'chat.thread.imageGone')}
            </AppText>
          </View>
        ) : null}
      </PressDim>
    </ContextMenuView>
  );
}

const styles = StyleSheet.create({
  menu: { borderRadius: RADIUS },
  failed: { alignItems: 'center', gap: vars['--space-2'], padding: vars['--space-3'] },
  failedText: { textAlign: 'center' },
  frame: {
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PlatformColor('secondarySystemFill'),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PlatformColor('separator'),
  },
});
