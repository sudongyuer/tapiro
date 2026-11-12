import { getLocales } from 'expo-localization';
import { Speech } from 'tapiro-kit';

import type { SpeechService } from './voice';

export const kitSpeech: SpeechService = {
  permissions: () => Speech.permissions(),
  requestPermissions: () => Speech.requestPermissions(),
  start: (requestId, language) =>
    Speech.start(requestId, language, getLocales()[0]?.regionCode ?? null),
  stop: (requestId) => Speech.stop(requestId),
  cancel: (requestId) => Speech.cancel(requestId),
  listen: (cb) => Speech.listen(cb),
};
