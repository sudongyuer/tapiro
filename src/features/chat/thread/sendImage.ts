import type { TFunction } from 'i18next';
import { Alert, Linking } from 'react-native';

import { dropOutboxImage, prepareImage } from '../images/imageFiles';
import { imageSource } from '../images/imageSource';
import { chatStore } from '../services';
import type { ImageFrom } from './AttachMenu';

function askSettings(t: TFunction) {
  Alert.alert(t('chat.thread.cameraDenied'), t('chat.thread.cameraDeniedBody'), [
    { text: t('chat.thread.cancel'), style: 'cancel' },
    { text: t('chat.thread.openSettings'), onPress: () => void Linking.openSettings() },
  ]);
}

export async function pickAndSend(threadId: string, from: ImageFrom, t: TFunction) {
  const outcome = from === 'camera' ? await imageSource.takePhoto() : await imageSource.pickPhoto();
  if (outcome.kind === 'denied') return askSettings(t);
  if (outcome.kind === 'unavailable') return Alert.alert(t('chat.thread.cameraUnavailable'));
  if (outcome.kind !== 'picked') return null;
  try {
    const image = await prepareImage(outcome.image);
    const sent = chatStore.send(threadId, '', image);
    if (sent === null) dropOutboxImage(image.file);
    return sent;
  } catch {
    Alert.alert(t('chat.thread.prepareFailed'));
    return null;
  }
}
