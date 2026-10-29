import type { CardDetail } from '@/lib/liveItems';
import { uiVerify, uiVerifyFixture } from '@/lib/uiVerify';

import { fixtureCardDetails } from './homeFixture';

export const homeCardDetails: Readonly<Record<string, CardDetail>> = uiVerify
  ? fixtureCardDetails(uiVerifyFixture)
  : {};
