export default {
  menu: 'Block {{name}}',
  confirm: {
    title: 'Block {{name}}?',
    body: 'You won’t see each other’s bounties or rides, or be able to join them. {{name}} won’t be notified. You can unblock in Me → Blocked.',
    confirm: 'Block',
    rideBody:
      'You won’t see each other’s bounties or rides. You’ll leave this ride if it hasn’t left yet, and it won’t count as a no-show; a ride that has left is unaffected. {{name}} won’t be notified. You can unblock in Me → Blocked.',
    applicantBody:
      'You won’t see each other’s bounties or be able to apply to them. {{name}} won’t be notified, and {{name}}’s application will disappear from here. You can unblock in Me → Blocked.',
    cancel: 'Don’t Block',
    rideMemberBody:
      'You won’t see each other’s bounties or rides. {{name}} will leave this ride if it hasn’t left yet, and it won’t count as a no-show; a ride that has left is unaffected. {{name}} won’t be notified. You can unblock in Me → Blocked.',
    threadBody:
      'Neither of you will be able to send messages in this chat, and you won’t see each other’s bounties or rides. The chat history stays. {{name}} won’t be notified. You can unblock at the bottom of the chat or in Me → Blocked.',
    groupBody:
      '{{name}} stays in this ride. Their messages will be folded, and you can tap to show them. You won’t see each other’s bounties or rides. {{name}} won’t be notified. You can unblock in Me → Blocked.',
  },
  unblock: {
    title: 'Unblock {{name}}?',
    body: 'You’ll see each other’s bounties and rides again, and this chat goes back to normal. {{name}} won’t be notified.',
    confirm: 'Unblock',
    cancel: 'Cancel',
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
