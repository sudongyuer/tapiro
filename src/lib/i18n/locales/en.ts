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
    home: {
      title: 'Home',
      greeting: 'Hi, {{name}}',
      comingSoon: 'Bounties and rides are coming soon.',
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
      error: {
        blocked:
          'You have a payment that isn’t settled yet. Settle it before deleting your account.',
        failed: 'Couldn’t delete your account. Try again.',
        network: 'No connection. Try again when you’re online.',
        signedOut: 'You’re already signed out.',
      },
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
    },
  },
};

export default en;
