import type zhHans from './zh-Hans';

const en: typeof zhHans = {
  status: {
    progress: 'Progress',
    summary: {
      poster: {
        assigned: '{{name}} took it',
        late: '{{name}} hasn’t left yet',
        enRoute: '{{name}} is on the way',
        done: 'Waiting for you to confirm',
        disputed: 'Waiting for {{name}} to sort it out',
        confirmed: 'Ready for you to pay',
        settled: 'Settled',
        cancelled: 'This bounty was cancelled',
      },
      helper: {
        assigned: 'Time to head out',
        late: 'Time to head out · past the agreed time',
        enRoute: 'You’re on the way',
        done: 'Waiting for {{name}} to confirm',
        disputed: '{{name}} reported a problem',
        confirmed: 'Waiting for {{name}} to pay',
        settled: 'Settled',
        cancelled: 'This bounty was cancelled',
      },
    },
    step: {
      poster: {
        selected: 'You chose {{name}}',
        started: '{{name}} headed out',
        completed: '{{name}} marks it done',
        confirm: 'You confirm it’s done',
        confirmed: 'You confirmed',
        paid: 'Pay {{name}} {{amount}}',
      },
      helper: {
        selected: '{{name}} chose you',
        start: 'Head out',
        started: 'You headed out',
        complete: 'Done',
        completed: 'You marked it done',
        confirmed: '{{name}} confirms',
        paid: 'Get {{amount}}',
      },
    },
    note: {
      departBy: 'Leave by {{time}}. Tap below when you head out.',
      departByPoster: 'Agreed to leave by {{time}}',
      late_one: 'Agreed to leave by {{time}}, {{count}} minute ago',
      late_other: 'Agreed to leave by {{time}}, {{count}} minutes ago',
      lateHours_one: 'Agreed to leave by {{time}}, {{count}} hour ago',
      lateHours_other: 'Agreed to leave by {{time}}, {{count}} hours ago',
      eta: 'Arriving around {{time}}',
      saidDone: '{{name}} says it’s done · {{time}}',
      autoConfirmPoster_one:
        'If you don’t respond, it’s confirmed automatically on {{date}} ({{count}} hour left)',
      autoConfirmPoster_other:
        'If you don’t respond, it’s confirmed automatically on {{date}} ({{count}} hours left)',
      autoConfirmHelper: 'If {{name}} doesn’t respond, it’s confirmed automatically on {{date}}',
      reason: '“{{reason}}”',
      disputeHelper: 'Once it’s sorted, tap Done again. The 48 hours start over.',
      yourReason: 'You said: “{{reason}}”',
      disputePoster:
        'Automatic confirmation is paused. The 48 hours start over when {{name}} taps Done again.',
      payPoster: 'The money goes straight to {{name}}. Tap “I’ve paid” when you’re done.',
      payHelper: '{{name}} pays you directly. Tap “Received” when it arrives.',
    },
    action: {
      start: 'Head Out',
      changeEta: 'Change Arrival Time',
      complete: 'Done',
      completeAgain: 'Sorted, Tap Done Again',
      confirm: 'Confirm Done',
      problem: 'Report a Problem',
      pay: 'Pay Now',
      view: 'View Progress',
      more: 'More',
      cancel: 'Cancel Bounty',
      withdraw: 'Stop Helping',
      sending: 'Sending',
    },
    failed: 'Couldn’t send. Try again.',
    stateChanged: 'This bounty’s status has changed',
    cancelled: 'This bounty was cancelled',
    loading: 'Loading this bounty',
    loadFailed: 'Couldn’t load this bounty',
    refreshFailed: 'Couldn’t refresh · this is from {{time}} and may have changed.',
    retry: 'Try Again',
    a11y: {
      step: '{{label}}, {{state}}',
      done: 'done',
      current: 'current step',
      needsYou: 'needs you',
      upcoming: 'not yet',
    },
  },
  eta: {
    title: 'When will you get there?',
    changeTitle: 'Change Arrival Time',
    body: '{{name}} will see this time. You can change it on the way.',
    picker: 'Arrival time',
    ok: 'OK',
    start: 'Head Out',
    cancel: 'Cancel',
    changed: '{{name}} changed the time at {{time}}',
    changedSelf: 'You changed the time at {{time}}',
    previous: 'Was {{time}}',
  },
  issue: {
    title: 'To {{name}}',
    placeholder: 'What’s wrong? Say it in a line',
    footer:
      '{{name}} will see this. Automatic confirmation pauses; once {{name}} sorts it out and taps Done again, the 48 hours start over.',
    count: '{{count}}/{{max}}',
    countLabel: '{{count}} of {{max}} characters',
    empty: 'Say what’s wrong',
    tooLong: 'Up to {{max}} characters',
    send: 'Send',
    cancel: 'Cancel',
    sending: 'Sending',
  },
  cancel: {
    titlePoster: 'Cancel this bounty?',
    titleHelper: 'Stop helping?',
    waiverPoster:
      'You already chose {{name}}, so cancelling now counts as a no-show. You have 1 waiver left for 60 days; this uses it and nothing is recorded.',
    countedPoster:
      'You already chose {{name}}, so cancelling now records a no-show (your 60-day waiver is used; it comes back on {{date}}).',
    waiverHelper:
      '{{name}} already chose you, so pulling out now counts as a no-show. You have 1 waiver left for 60 days; this uses it and nothing is recorded.',
    countedHelper:
      '{{name}} already chose you, so pulling out now records a no-show (your 60-day waiver is used; it comes back on {{date}}).',
    countedPosterUndated:
      'You already chose {{name}}, so cancelling now records a no-show (your 60-day waiver is used).',
    countedHelperUndated:
      '{{name}} already chose you, so pulling out now records a no-show (your 60-day waiver is used).',
    otherLate:
      '{{name}} is 30 minutes past the agreed time and hasn’t left. If you cancel now, it counts against {{name}}, not you.',
    confirmPoster: 'Cancel Bounty',
    confirmHelper: 'Stop Helping',
    keepPoster: 'Don’t Cancel',
    keepHelper: 'Keep Helping',
    checking: 'Checking what cancelling means',
    sending: 'Cancelling',
  },
  close: {
    menu: 'Close Bounty',
    title: 'Close this bounty?',
    free_one:
      'It comes off the board and this month’s free post comes back to you. The {{count}} applicant will see it was closed.',
    free_other:
      'It comes off the board and this month’s free post comes back to you. The {{count}} applicants will see it was closed.',
    coin_one:
      'It comes off the board and your 1 coin comes back to you. The {{count}} applicant will see it was closed.',
    coin_other:
      'It comes off the board and your 1 coin comes back to you. The {{count}} applicants will see it was closed.',
    freeNone: 'It comes off the board and this month’s free post comes back to you.',
    coinNone: 'It comes off the board and your 1 coin comes back to you.',
    confirm: 'Close Bounty',
    keep: 'Keep It Open',
    sending: 'Closing',
  },
  confirm: {
    title: 'Confirm {{name}} is done?',
    body: 'After confirming you can’t report a problem. Next, you pay {{name}} {{amount}}.',
    confirm: 'Confirm Done',
    cancel: 'Not Yet',
    sending: 'Confirming',
  },
  live: {
    poster: {
      open: 'Waiting for applicants',
      applicants_one: '{{count}} applicant, choose now',
      applicants_other: '{{count}} applicants, choose now',
      assigned: '{{name}} took it · leaves by {{time}}',
      late: '{{name}} hasn’t left yet',
      enRoute: '{{name}} is on the way · arrives {{time}}',
      done: '{{name}} says it’s done · confirm',
      disputed: 'Waiting for {{name}} to sort it out',
      expiredFree: 'Expired · free post returned',
      expiredCoin: 'Expired · coin returned',
    },
    helper: {
      assigned: '{{name}} chose you · leave by {{time}}',
      late: 'Time to head out',
      enRoute: 'On your way · tap Done when you arrive',
      done: 'Waiting for {{name}} · auto-confirms {{date}}',
      disputed: '{{name}} reported a problem',
    },
    applicant: {
      waiting: 'Waiting for {{name}} to choose',
      notSelected: 'Not chosen this time',
    },
    action: {
      choose: 'Choose',
      start: 'Head Out',
      confirm: 'Confirm',
      handle: 'Sort It Out',
      view: 'View',
    },
  },
};

export default en;
