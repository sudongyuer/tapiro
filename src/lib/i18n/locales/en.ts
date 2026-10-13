import type { Translation } from '../resources';

const en: Translation = {
  account: {
    signIn: {
      google: 'Sign in with Google',
      error: {
        notConfigured: 'Sign-in isn’t set up yet.',
        cancelled: 'Sign-in cancelled.',
        failed: 'Couldn’t sign in. Try again.',
        network: 'No connection. Try again when you’re online.',
      },
    },
    welcome: {
      title: 'Welcome to Tapiro',
      tagline: 'Students in Malaysia, helping each other out.',
    },
    name: {
      title: 'Your Name',
      label: 'Name',
      placeholder: 'Enter your name',
      footer: 'Other students see this name. Up to 40 characters.',
      avatar: 'Profile photo',
      signOut: 'Sign Out',
      continue: 'Continue',
      error: {
        empty: 'Enter a name.',
        tooLong: 'Use 40 characters or fewer.',
        saveFailed: 'Couldn’t save your name. Try again.',
      },
    },
    language: {
      title: 'Language',
      footer: 'Tapiro follows your system language. You can change it later in Settings.',
      done: 'Get Started',
    },
    me: {
      settings: 'Settings',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      signOut: 'Sign Out',
      deleteAccount: 'Delete Account',
      deleteFooter: 'A deleted account can’t be restored.',
    },
    delete: {
      title: 'Delete Your Account?',
      intro: 'This permanently deletes:',
      items: {
        profile: 'Your profile (name and photo)',
        payee: 'Your ways to receive payment',
        messages: 'Messages and reviews you wrote',
        memory: 'What Tapir remembers about you',
        coins: 'Your Tapir coins',
        stickers: 'Your stickers',
      },
      confirm: 'Delete Account',
      cancel: 'Cancel',
      deleting: 'Deleting account',
      payment: {
        owe: 'You pay {{name}} {{amount}}',
        owed: '{{name}} pays you {{amount}}',
      },
      error: {
        blocked:
          'You have a payment that isn’t settled yet. Settle it before deleting your account.',
        failed: 'Couldn’t delete your account. Try again.',
        network: 'No connection. Try again when you’re online.',
        signedOut: 'You’re already signed out.',
      },
    },
  },
  shell: {
    tabs: {
      bounty: 'Bounties',
      ride: 'Rides',
      messages: 'Messages',
      me: 'Me',
      askTapir: 'Ask Tapir',
    },
    home: {
      title: 'Bounties',
      liveCards: 'What’s happening now will show here',
      sectionTitle: 'Bounties you can take',
      placeholder: 'Bounties arrive in the next release',
    },
    ride: {
      emptyTitle: 'Rides are coming soon',
      emptyBody: 'Share a car back to YC and split the fare automatically',
    },
    messages: {
      emptyTitle: 'No messages yet',
      emptyBody: 'Chats show up here once you take a bounty or join a ride',
    },
    accessory: {
      withMore: '{{sub}} · {{count}} more',
      hint: 'Opens Bounties and fans out your live cards',
      money: 'RM',
    },
    ask: {
      title: 'Ask Tapir',
      subtitle: {
        bounty: 'On Bounties · write a bounty or find one to take',
        ride: 'On Rides · find riders and split the fare',
        messages: 'On Messages · reply or translate',
        me: 'On Me · see what Tapir remembers',
      },
      prompt: {
        bounty: 'What do you need? One sentence is enough',
        ride: 'Who’s heading back to YC? When, and from where?',
        messages: 'Reply to Ah Kit, or translate something',
      },
      suggestions: {
        bounty: { first: 'Pick up my parcel', second: 'What can I take nearby?' },
        ride: { first: 'Who’s going back to YC at 5 pm?', second: 'Split this Grab receipt' },
        messages: { first: 'Translate Aiman’s message', second: 'Tell Ah Kit: wait in the lobby' },
        writeBounty: 'Write a bounty for me',
      },
      mic: 'Speak',
      comingSoon: 'Voice and AI drafts are coming soon',
      close: 'Close',
    },
  },
  debug: {
    title: 'Debug',
    account: {
      title: 'Sign-in',
      loading: 'Checking sign-in',
      signedOut: 'Signed out',
      signedIn: 'Signed in as {{name}}',
      scenes: {
        welcome: 'Welcome',
        profileSetup: 'Name step (long name)',
        settings: 'Settings (long name)',
        deleteBlocked: 'Delete account (unsettled payment)',
      },
    },
    tokens: {
      title: 'Design tokens',
      roleSample: '{{role}} bounty',
      reward: 'RM 15',
      statusOpen: 'Open',
      statusActive: 'In progress',
      statusPending: 'To confirm',
      statusDone: 'Done',
      statusUrgent: 'Urgent',
      accept: 'Accept',
      posted: 'Your bounty is posted',
      liveSample: 'Pay Ah Kit RM 15',
      mascot: 'Tapir mascot',
    },
  },
};

export default en;
