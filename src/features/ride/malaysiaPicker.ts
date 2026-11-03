import { environment } from '@expo/ui/swift-ui/modifiers';

import { MALAYSIA_TIME_ZONE } from './rideClock';

export const malaysiaPicker = environment('timeZone', MALAYSIA_TIME_ZONE);
