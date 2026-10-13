import { uiVerify, uiVerifyArgument } from '@/lib/uiVerify';

import { createShellFeed, EMPTY_SHELL_FEED } from './shellFeed';
import { fixtureShellFeed } from './shellFixture';

export const shellFeed = createShellFeed(
  uiVerify ? fixtureShellFeed(uiVerifyArgument('uiVerifyShellFeed')) : EMPTY_SHELL_FEED,
);
