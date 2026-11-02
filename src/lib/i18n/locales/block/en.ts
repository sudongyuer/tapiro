export default {
  menu: 'Block {{name}}',
  confirm: {
    title: 'Block {{name}}?',
    body: 'You won’t see each other’s bounties or rides, or be able to join them. {{name}} won’t be notified. You can unblock in Me → Blocked.',
    confirm: 'Block',
    applicantBody:
      'You won’t see each other’s bounties or be able to apply to them. {{name}} won’t be notified, and {{name}}’s application will disappear from here. You can unblock in Me → Blocked.',
    cancel: 'Don’t Block',
  },
  blocking: 'Blocking',
  failed: 'Couldn’t block. Try again.',
  list: {
    title: 'Blocked',
    loading: 'Loading blocked people',
    failed: 'Couldn’t load blocked people',
    refreshFailed: 'Couldn’t refresh · showing the last list loaded',
    retry: 'Try Again',
    emptyTitle: 'You haven’t blocked anyone',
    emptyBody: 'To block someone, tap “⋯” at the top right of their bounty or ride.',
    footer:
      'Swipe left on a row to unblock. You’ll see each other’s bounties and rides again, and they won’t be notified.',
    unblock: 'Unblock',
    unblocking: 'Unblocking',
    unblockFailed: 'Couldn’t unblock. Try again.',
  },
};
