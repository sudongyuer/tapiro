import type { BountyCache } from '../shared/bountyCache';

export function reloadOnOwnApplications(
  cache: Pick<BountyCache, 'onApplicationChange'>,
  reload: () => void,
) {
  return cache.onApplicationChange((change) => {
    if (!change.fromServer) reload();
  });
}
