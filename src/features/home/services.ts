import { uiVerify, uiVerifyFixture } from '@/lib/uiVerify';

import { fixtureCardDetails } from './homeFixture';
import type { CardDetail } from './homeModel';

export const homeCardDetails: Readonly<Record<string, CardDetail>> = uiVerify
  ? fixtureCardDetails(uiVerifyFixture)
  : {};
