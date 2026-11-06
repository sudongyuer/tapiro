import type zhHans from './zh-Hans';

const en: typeof zhHans = {
  row: 'Coins',
  title: 'Coins',
  freePosts: '{{left}} of {{total}} free posts left this month',
  empty: 'No activity yet',
  failed: 'Didn’t load',
  retry: 'Try Again',
  more: 'Load earlier activity',
  moreFailed: 'Earlier activity didn’t load',
  withTitle: '{{reason}} · {{title}}',
  reason: {
    new_user: 'Welcome gift',
    onboarding_payee_method: 'Set up a payment method',
    onboarding_first_post: 'First post',
    onboarding_first_help: 'First help',
    help_settled: 'Helped out',
    post_spend: 'Post',
    post_refund: 'Refund',
    weekly_feed: 'Weekly feed',
    invite_inviter: 'Invite reward',
    invite_invitee: 'Invite reward',
    other: 'Other',
  },
  feed: {
    idle: 'New week. Tap me for a leaf',
    fed: 'Thanks! +1 coin',
    alreadyFed: 'I’m full this week. Come back Monday',
    failed: 'That didn’t go through. Tap me again',
    action: 'Feed the tapir',
  },
  invite: {
    row: 'Invite Friends',
    title: 'Invite Friends',
    myCode: 'My invite code',
    copy: 'Copy',
    share: 'Share',
    explain:
      'When a friend enters your code and finishes their first deal, you each get {{reward}} coins',
    shareText:
      'I use Tapiro to help each other out. Enter my invite code {{code}} and we each get {{reward}} coins after your first deal.',
    enterCode: 'Enter a friend’s code',
    placeholder: 'e.g. {{code}}',
    submit: 'OK',
    invited: 'People I invited',
    rewarded: 'First deal done · +{{reward}}',
    waiting: 'Not done yet',
    error: {
      notFound: 'No such invite code',
      malformed: 'No such invite code',
      ownCode: 'That’s your own invite code',
      alreadyRedeemed: 'You’ve already entered an invite code',
      tooLate: 'Invite codes can’t be entered after your first deal',
      mutual: 'You invited them, so you can’t use their code',
      failed: 'That didn’t go through. Check your connection and try again',
    },
  },
};

export default en;
