import type { PostDraft } from './types';

export async function checkSentDraft(deps: {
  draft: PostDraft;
  isEmpty: (draft: PostDraft) => boolean;
  isPublished: (id: string) => Promise<boolean>;
  stillCurrent: (id: string) => boolean;
  onSent: () => void;
}) {
  if (deps.isEmpty(deps.draft)) return;
  let sent: boolean;
  try {
    sent = await deps.isPublished(deps.draft.id);
  } catch {
    return;
  }
  if (sent && deps.stillCurrent(deps.draft.id)) deps.onSent();
}
