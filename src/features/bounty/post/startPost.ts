import type { PostStatus } from './types';

export function createStartPost(deps: {
  status: () => Promise<PostStatus>;
  open: () => void;
  hint: (status: PostStatus) => void;
}) {
  return async function start() {
    deps.open();
    let status: PostStatus;
    try {
      status = await deps.status();
    } catch {
      return;
    }
    if (status.blocked) deps.hint(status);
  };
}
