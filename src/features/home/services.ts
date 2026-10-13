import { uiVerify } from '@/lib/uiVerify';

import { FIXTURE_CARD_DETAILS } from './homeFixture';
import type { CardDetail } from './homeModel';

export const homeCardDetails: Readonly<Record<string, CardDetail>> = uiVerify
  ? FIXTURE_CARD_DETAILS
  : {};
